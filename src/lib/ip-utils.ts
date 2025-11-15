/**
 * IP Utilities
 * Functions for IP address validation and subnet matching
 */

/**
 * Convert an IP address string to a 32-bit integer
 */
function ipToInt(ip: string): number {
    const parts = ip.split(".").map((part) => parseInt(part, 10));
    if (parts.length !== 4 || parts.some((part) => isNaN(part) || part < 0 || part > 255)) {
        throw new Error(`Invalid IP address: ${ip}`);
    }
    return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/**
 * Check if an IP address belongs to a given CIDR subnet
 * @param clientIp - The client's IP address (e.g., "10.12.16.123")
 * @param subnet - The subnet in CIDR notation (e.g., "10.12.16.0/24")
 * @returns true if the IP belongs to the subnet, false otherwise
 *
 * @example
 * isIpInSubnet("10.12.16.123", "10.12.16.0/24") // true
 * isIpInSubnet("10.12.16.123", "10.12.16.123/32") // true
 * isIpInSubnet("10.12.17.123", "10.12.16.0/24") // false
 */
export function isIpInSubnet(clientIp: string, subnet: string): boolean {
    try {
        // Parse CIDR notation
        const [subnetIp, prefixLengthStr] = subnet.split("/");
        if (!subnetIp || !prefixLengthStr) {
            throw new Error(`Invalid CIDR notation: ${subnet}`);
        }

        const prefixLength = parseInt(prefixLengthStr, 10);
        if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
            throw new Error(`Invalid prefix length: ${prefixLengthStr}`);
        }

        // Convert IPs to integers
        const clientIpInt = ipToInt(clientIp);
        const subnetIpInt = ipToInt(subnetIp);

        // Create subnet mask
        // For prefix length 24, mask = 0xFFFFFF00
        // For prefix length 32, mask = 0xFFFFFFFF
        const mask = prefixLength === 0 ? 0 : -1 << (32 - prefixLength);

        // Check if the client IP belongs to the subnet
        return (clientIpInt & mask) === (subnetIpInt & mask);
    } catch (error) {
        console.error("Error checking IP subnet:", error);
        return false;
    }
}

/**
 * Extract client IP from various request headers
 * Checks common headers used by proxies and load balancers
 */
export function getClientIp(headers: Headers): string | null {
    // Check various headers that might contain the client IP
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(",")[0].trim();
    }

    const realIp = headers.get("x-real-ip");
    if (realIp) {
        return realIp.trim();
    }

    const cfConnectingIp = headers.get("cf-connecting-ip"); // Cloudflare
    if (cfConnectingIp) {
        return cfConnectingIp.trim();
    }

    // Note: In Next.js API routes, we might need to use a different approach
    // This is a basic implementation
    return null;
}

/**
 * Check if client IP matches any of the provided lab subnets
 */
export function isClientInLabSubnets(clientIp: string | null, labSubnets: string[]): boolean {
    if (!clientIp || labSubnets.length === 0) {
        return false;
    }

    return labSubnets.some((subnet) => isIpInSubnet(clientIp, subnet));
}
