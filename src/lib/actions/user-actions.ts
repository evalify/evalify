const KEY = `${process.env.NEXT_PUBLIC_REGISTRATION_KEY}`

export async function createUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'STUDENT' | 'STAFF';
    rollNo?: string;
    phoneNo?: string;
}) {
    const formData = new FormData();
    formData.append("key", KEY || "evalify")

    Object.entries(userData).forEach(([key, value]) => {
        if (value) formData.append(key, value.toString());
    });

    const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
    }

    return response.json();
}

export function generateInitialPassword(type: 'STAFF' | 'STUDENT', identifier: string) {
    if (type === 'STAFF') {
        return `${identifier}@123`;
    }
    return identifier; // For students, use roll number as password
}

export async function createUserWithRole(userData: {
    name: string;
    email: string;
    role: 'STUDENT' | 'STAFF';
    rollNo: string; // Make rollNo required
}) {
    const identifier = userData.role === 'STUDENT' ? userData.rollNo! : userData.email.split('@')[0];
    const password = generateInitialPassword(userData.role, identifier);

    const formData = new FormData();
    formData.append("key", KEY || "evalify")

    Object.entries({ ...userData, password }).forEach(([key, value]) => {
        if (value) formData.append(key, value.toString());
    });

    const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
    }

    return response.json();
}
