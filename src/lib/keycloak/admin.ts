import KcAdminClient from "@keycloak/keycloak-admin-client";
import { logger } from "@/lib/logger";

// Environment variables
const KEYCLOAK_ADMIN_URL = process.env.AUTH_KEYCLOAK_ADMIN_URL || "";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "evalify";
const KEYCLOAK_ADMIN_CLIENT_ID = process.env.AUTH_KEYCLOAK_ADMIN_CLIENT_ID || "";
const KEYCLOAK_ADMIN_CLIENT_SECRET = process.env.AUTH_KEYCLOAK_ADMIN_CLIENT_SECRET || "";

/**
 * Keycloak user interface matching the API response
 */
export interface KeycloakUser {
    id: string;
    username: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    enabled: boolean;
    emailVerified: boolean;
    attributes?: {
        profileId?: string[];
        phoneNumber?: string[];
        [key: string]: string[] | undefined;
    };
    realmRoles?: string[];
    groups?: string[];
}

/**
 * Singleton Keycloak Admin Client
 */
class KeycloakAdminService {
    private client: KcAdminClient | null = null;
    private lastAuth: number = 0;
    private readonly AUTH_TIMEOUT = 58 * 1000; // Re-authenticate every 58 seconds (token expires in 60s)

    /**
     * Get authenticated Keycloak admin client
     */
    private async getClient(): Promise<KcAdminClient> {
        const now = Date.now();

        // Create new client if needed
        if (!this.client) {
            this.client = new KcAdminClient({
                baseUrl: KEYCLOAK_ADMIN_URL,
                realmName: KEYCLOAK_REALM,
            });
        }

        // Re-authenticate if token is expired or close to expiring
        if (now - this.lastAuth > this.AUTH_TIMEOUT) {
            try {
                logger.info(
                    {
                        baseUrl: KEYCLOAK_ADMIN_URL,
                        realm: KEYCLOAK_REALM,
                        clientId: KEYCLOAK_ADMIN_CLIENT_ID,
                        hasClientSecret: !!KEYCLOAK_ADMIN_CLIENT_SECRET,
                        clientSecretLength: KEYCLOAK_ADMIN_CLIENT_SECRET.length,
                    },
                    "Attempting Keycloak admin authentication with client credentials"
                );

                await this.client.auth({
                    grantType: "client_credentials",
                    clientId: KEYCLOAK_ADMIN_CLIENT_ID,
                    clientSecret: KEYCLOAK_ADMIN_CLIENT_SECRET,
                });
                this.lastAuth = now;
                logger.info("Keycloak admin client authenticated successfully");
            } catch (error: unknown) {
                const err = error as {
                    message?: string;
                    response?: { data?: unknown; status?: number };
                    responseData?: unknown;
                };
                logger.error(
                    {
                        error: err.message,
                        response: err.response?.data,
                        responseData: err.responseData,
                        status: err.response?.status,
                        baseUrl: KEYCLOAK_ADMIN_URL,
                        realm: KEYCLOAK_REALM,
                        clientId: KEYCLOAK_ADMIN_CLIENT_ID,
                    },
                    "Failed to authenticate Keycloak admin client"
                );
                throw new Error(
                    `Failed to authenticate with Keycloak: ${err.message || JSON.stringify(err.responseData)}`
                );
            }
        }

        return this.client;
    }

    /**
     * Fetch all users from Keycloak
     */
    async getAllUsers(): Promise<KeycloakUser[]> {
        try {
            const client = await this.getClient();

            // Fetch users
            const users = await client.users.find({
                realm: KEYCLOAK_REALM,
                max: 10000, // Set a high limit to get all users
            });

            // Enrich users with roles and groups
            const enrichedUsers = await Promise.all(
                users.map(async (user) => {
                    try {
                        // Get realm roles for user
                        const realmRoles = await client.users.listRealmRoleMappings({
                            id: user.id!,
                            realm: KEYCLOAK_REALM,
                        });

                        // Get groups for user
                        const groups = await client.users.listGroups({
                            id: user.id!,
                            realm: KEYCLOAK_REALM,
                        });

                        return {
                            ...user,
                            realmRoles: realmRoles
                                .map((role) => role.name)
                                .filter(Boolean) as string[],
                            groups: groups
                                .flatMap((group) => (group.path || group.name || "").split("/"))
                                .filter(Boolean) as string[],
                        } as KeycloakUser;
                    } catch (error) {
                        logger.warn(
                            { userId: user.id, error },
                            "Failed to fetch roles/groups for user"
                        );
                        return {
                            ...user,
                            realmRoles: [],
                            groups: [],
                        } as KeycloakUser;
                    }
                })
            );

            logger.info({ count: enrichedUsers.length }, "Fetched users from Keycloak");
            return enrichedUsers;
        } catch (error) {
            logger.error({ error }, "Failed to fetch users from Keycloak");
            throw new Error("Failed to fetch users from Keycloak");
        }
    }

    /**
     * Get a single user by ID from Keycloak
     */
    async getUserById(userId: string): Promise<KeycloakUser | null> {
        try {
            const client = await this.getClient();

            const user = await client.users.findOne({
                id: userId,
                realm: KEYCLOAK_REALM,
            });

            if (!user) {
                return null;
            }

            // Get realm roles
            const realmRoles = await client.users.listRealmRoleMappings({
                id: userId,
                realm: KEYCLOAK_REALM,
            });

            // Get groups
            const groups = await client.users.listGroups({
                id: userId,
                realm: KEYCLOAK_REALM,
            });

            return {
                ...user,
                realmRoles: realmRoles.map((role) => role.name).filter(Boolean) as string[],
                groups: groups
                    .flatMap((group) => (group.path || group.name || "").split("/"))
                    .filter(Boolean) as string[],
            } as KeycloakUser;
        } catch (error) {
            logger.error({ error, userId }, "Failed to fetch user from Keycloak");
            return null;
        }
    }
}

// Export singleton instance
export const keycloakAdmin = new KeycloakAdminService();
