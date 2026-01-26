enum UserType {
    ADMIN = "admin",
    MANAGER = "manager",
    STAFF = "faculty",
    STUDENT = "student",
}

// Utility function to check if user has any of the required roles
export function hasRequiredRole(userRole: string | undefined, requiredRoles: UserType[]): boolean {
    if (!userRole || requiredRoles.length === 0) return false;
    return requiredRoles.includes(userRole as UserType);
}

// Utility function to check if user belongs to any of the required groups
export function belongsToRequiredGroup(
    userGroups: string[] | undefined,
    requiredGroups: string[]
): boolean {
    if (!userGroups || requiredGroups.length === 0) return false;
    return requiredGroups.some((group) => userGroups.includes(group));
}

// Combined utility function to check both roles and groups
export function hasAccess(
    userRoles: string[] | undefined,
    userGroups: string[] | undefined,
    requiredRoles: UserType[] = [],
    requiredGroups: string[] = []
): boolean {
    const hasRole =
        requiredRoles.length === 0 ||
        (userRoles?.some((role) => hasRequiredRole(role, requiredRoles)) ?? false);
    const hasGroup =
        requiredGroups.length === 0 || belongsToRequiredGroup(userGroups, requiredGroups);

    // User needs to satisfy both role and group requirements if both are specified
    return hasRole && hasGroup;
}

export { UserType };

import { decodeJwt } from "jose";
import { DecodedJWT, KeycloakToken } from "./types";
import { logger } from "../logger";

export function processDecodedToken(decoded: DecodedJWT | null): {
    roles: string[];
    groups: string[];
} {
    let roles: string[] = [];
    let groups: string[] = [];
    if (decoded && typeof decoded === "object" && !Array.isArray(decoded)) {
        const decodedJWT = decoded as DecodedJWT;
        roles = decodedJWT.realm_access?.roles || [];
        groups = (decodedJWT.groups || []).map((group: string) => group.replace(/^\//, ""));
    }
    return { roles, groups };
}

export async function refreshKeycloakAccessToken(
    token: KeycloakToken
): Promise<KeycloakToken | null> {
    try {
        logger.info("Attempting to refresh Keycloak access token...");

        // Ensure environment variables are defined. specific error handling might be better
        // but for now we trust they are present as per existing logic, or throw if not.
        if (
            !process.env.AUTH_KEYCLOAK_ISSUER ||
            !process.env.AUTH_KEYCLOAK_ID ||
            !process.env.AUTH_KEYCLOAK_SECRET
        ) {
            throw new Error("Missing Keycloak environment variables");
        }

        const response = await fetch(
            `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`,
            {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: token.refresh_token!,
                    client_id: process.env.AUTH_KEYCLOAK_ID,
                    client_secret: process.env.AUTH_KEYCLOAK_SECRET,
                }),
            }
        );

        const refreshedTokens = await response.json();
        if (!response.ok) {
            // If session is not active, return null to invalidate the session gracefully
            if (
                refreshedTokens.error === "invalid_grant" &&
                refreshedTokens.error_description === "Session not active"
            ) {
                logger.info("Session has expired, invalidating session");
                return null;
            }

            logger.error(
                {
                    status: response.status,
                    statusText: response.statusText,
                    error: refreshedTokens,
                },
                "Failed to refresh access token"
            );
            throw new Error(
                `Token refresh failed: ${
                    refreshedTokens.error_description || refreshedTokens.error || "Unknown error"
                }`
            );
        }

        const decoded = decodeJwt(refreshedTokens.access_token);
        const { roles, groups } = processDecodedToken(decoded as DecodedJWT);

        logger.info("Successfully refreshed access token");
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
        logger.error({ err: error }, "Error refreshing access token");

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
