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
