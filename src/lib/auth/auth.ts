import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { decodeJwt } from "jose";
import type { Account, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

interface KeycloakToken {
    access_token: string;
    refresh_token?: string;
    expires_at: number;
    session_expires_at?: number;
    groups: string[];
    roles?: string[];
    id_token?: string;
    error?: string;
    id?: string;
    [key: string]: unknown;
}

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return v;
}

const AUTH_KEYCLOAK_ID = requireEnv("AUTH_KEYCLOAK_ID");
const AUTH_KEYCLOAK_SECRET = requireEnv("AUTH_KEYCLOAK_SECRET");
const AUTH_KEYCLOAK_ISSUER = requireEnv("AUTH_KEYCLOAK_ISSUER");
const NEXTAUTH_SECRET = requireEnv("NEXTAUTH_SECRET");

interface DecodedJWT {
    realm_access?: {
        roles?: string[];
    };
    groups?: string[];
    [key: string]: unknown;
}

// Extend NextAuth's JWT with Keycloak-specific fields so callbacks remain fully typed
type KeycloakJWT = JWT & {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    // Use numeric expires_at to stay compatible with arithmetic operations
    expires_at?: number;
    session_expires_at?: number;
    roles?: string[];
    groups?: string[];
    id?: string;
    error?: string;
    [key: string]: unknown;
};

function processDecodedToken(decoded: DecodedJWT): {
    roles: string[];
    groups: string[];
} {
    const roles = decoded.realm_access?.roles || [];
    const groups = (decoded.groups || []).map((group: string) => group.replace(/^\//, ""));
    return { roles, groups };
}

async function refreshKeycloakAccessToken(token: KeycloakToken): Promise<KeycloakToken | null> {
    try {
        console.log("Attempting to refresh Keycloak access token...");

        const response = await fetch(`${AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: token.refresh_token!,
                client_id: AUTH_KEYCLOAK_ID,
                client_secret: AUTH_KEYCLOAK_SECRET,
            }),
        });

        const refreshedTokens = await response.json();
        if (!response.ok) {
            // If session is not active, return null to invalidate the session gracefully
            if (
                refreshedTokens.error === "invalid_grant" &&
                refreshedTokens.error_description === "Session not active"
            ) {
                console.log("Session has expired, invalidating session");
                return null;
            }

            console.error("Failed to refresh access token:", {
                status: response.status,
                statusText: response.statusText,
                error: refreshedTokens,
            });
            throw new Error(
                `Token refresh failed: ${
                    refreshedTokens.error_description || refreshedTokens.error || "Unknown error"
                }`
            );
        }

        const decoded = decodeJwt(refreshedTokens.access_token) as DecodedJWT;
        const { roles, groups } = processDecodedToken(decoded);

        console.log("Successfully refreshed access token");
        return {
            ...token,
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token ?? token.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
            roles: roles,
            groups: groups,
            id_token: refreshedTokens.id_token ?? token.id_token,
            error: undefined,
        };
    } catch (error: unknown) {
        console.error("Error refreshing access token:", error);

        let errorMessage = "RefreshAccessTokenError";
        if (error instanceof Error) {
            errorMessage = `RefreshAccessTokenError: ${error.message}`;
        }

        return {
            ...token,
            error: errorMessage,
        };
    }
}
const authOptions: NextAuthConfig = {
    providers: [
        Keycloak({
            clientId: AUTH_KEYCLOAK_ID,
            clientSecret: AUTH_KEYCLOAK_SECRET,
            issuer: AUTH_KEYCLOAK_ISSUER,
            authorization: {
                params: {
                    prompt: "login",
                    max_age: 0,
                },
            },
        }),
    ],
    pages: {
        signIn: "/auth/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: NEXTAUTH_SECRET,
    callbacks: {
        async jwt({
            token,
            account,
            user,
        }: {
            token: JWT;
            account?: Account | null;
            user?: User | null;
        }): Promise<KeycloakJWT> {
            const keyToken = token as KeycloakJWT;
            // Initial sign-in
            if (account && user) {
                const decoded = decodeJwt(account.access_token!) as DecodedJWT;
                const { roles, groups } = processDecodedToken(decoded);
                // Calculate session expiry based on Keycloak's refresh token expiry
                const refreshExpiresIn =
                    typeof account.refresh_expires_in === "number"
                        ? account.refresh_expires_in
                        : 600;
                const sessionExpiresAt = Math.floor(Date.now() / 1000) + refreshExpiresIn;
                return {
                    ...keyToken,
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    id_token: account.id_token,
                    expires_at: account.expires_at,
                    session_expires_at: sessionExpiresAt,
                    roles: roles,
                    groups: groups,
                    id: user.id,
                };
            }
            if (
                keyToken.session_expires_at &&
                typeof keyToken.session_expires_at === "number" &&
                Date.now() > keyToken.session_expires_at * 1000
            ) {
                console.log("Session has expired based on Keycloak refresh token expiry");
                return { ...keyToken, error: "SessionExpired" } as KeycloakJWT;
            }

            // Token still valid
            // Coerce expires_at to a number before doing arithmetic to satisfy TS
            const expiresAt = keyToken?.expires_at ? Number(keyToken.expires_at) : 0;
            if (expiresAt && Date.now() < expiresAt * 1000 - 15 * 1000) {
                return keyToken;
            } // Try to refresh
            if (keyToken.refresh_token) {
                const refreshedToken = await refreshKeycloakAccessToken(
                    keyToken as unknown as KeycloakToken
                );
                // If refresh returns null (session expired), invalidate the session
                if (!refreshedToken) {
                    return { ...keyToken, error: "SessionExpired" } as KeycloakJWT;
                }
                // Map refreshedToken (KeycloakToken) back to KeycloakJWT
                return {
                    ...keyToken,
                    access_token: refreshedToken.access_token,
                    refresh_token: refreshedToken.refresh_token,
                    expires_at: refreshedToken.expires_at,
                    id_token: refreshedToken.id_token,
                    roles: refreshedToken.roles,
                    groups: refreshedToken.groups,
                    error: refreshedToken.error,
                } as KeycloakJWT;
            }

            // No refresh token or refresh failed — mark token with error so session
            // callback can handle it and keep return type consistent.
            return { ...keyToken, error: "NoRefreshToken" } as KeycloakJWT;
        },
        async session({ session, token }: { session: Session; token: KeycloakJWT }) {
            if (token) {
                session.user.id = token.id as string; // Ensure id is correctly assigned
                session.user.roles = (token.roles ?? []) as string[];
                session.user.groups = (token.groups ?? []) as string[];
                session.access_token = token.access_token as string;
                if (token.error) {
                    session.error = token.error as string;
                }
            }
            return session;
        },
    },
    events: {
        async signOut(message) {
            if ("token" in message && message.token?.id_token) {
                try {
                    const logoutUrl = new URL(
                        `${AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/logout`
                    );
                    logoutUrl.searchParams.set("id_token_hint", message.token.id_token as string);
                    logoutUrl.searchParams.set("client_id", AUTH_KEYCLOAK_ID);

                    const response = await fetch(logoutUrl, { method: "GET" });
                    if (response.ok) {
                        console.log("Keycloak session terminated successfully");
                    } else {
                        console.error(
                            "Keycloak logout failed:",
                            response.status,
                            response.statusText
                        );
                    }
                    console.log("Keycloak session terminated successfully");
                } catch (error) {
                    console.error("Error terminating Keycloak session:", error);
                }
            }
        },
    },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions);
