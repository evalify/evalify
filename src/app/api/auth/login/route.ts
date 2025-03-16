/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate with Authentik
 *     description: Authenticates a user using Authentik OAuth2 password grant flow
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's username
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: OAuth2 access token
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        const response = await fetch(`${process.env.AUTHENTIK_ISSUER!}/oauth/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "password",
                username,
                password,
                client_id: process.env.AUTHENTIK_CLIENT_ID!,
                client_secret: process.env.AUTHENTIK_CLIENT_SECRET!,
            }),
        });

        // Log raw response for debugging
        console.log("Authentik API response:", response);

        // Check response status
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Fallback to empty object
            console.log(errorData)
            return NextResponse.json({ error: errorData.error_description || "Invalid credentials" }, { status: 401 });
        }

        // Parse JSON response
        const data = await response.json().catch(() => null);

        if (!data) {
            throw new Error("Empty or invalid JSON response from Authentik");
        }

        // Optionally set tokens in cookies
        return NextResponse.json({ accessToken: data.access_token });
    } catch (error: any) {
        console.log("Error in login API:", error.message);
        return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
    }
}
