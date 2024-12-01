'use client';

import { useState } from 'react';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'STUDENT',
        phoneNo: '',
        rollNo: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const submitFormData = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                submitFormData.append(key, value);
            });
            if (imageFile) {
                submitFormData.append('image', imageFile);
            }

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                body: submitFormData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Registration failed.');
            } else {
                setSuccess('User registered successfully!');
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: 'STUDENT',
                    phoneNo: '',
                    rollNo: '',
                });
                setImageFile(null);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setError('Something went wrong. Please try again.');
        }
    };

    return (
        <div className="container">
            <h1>Register User</h1>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Name:</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                    <label>Email:</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
                <div>
                    <label>Password:</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                </div>
                <div>
                    <label>Role:</label>
                    <select name="role" value={formData.role} onChange={handleChange}>
                        <option value="STUDENT">Student</option>
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>
                <div>
                    <label>Phone No:</label>
                    <input type="text" name="phoneNo" value={formData.phoneNo} onChange={handleChange} />
                </div>
                <div>
                    <label>Roll No:</label>
                    <input type="text" name="rollNo" value={formData.rollNo} onChange={handleChange} />
                </div>
                <div>
                    <label>Profile Image:</label>
                    <input 
                        type="file" 
                        name="image" 
                        accept="image/*"
                        onChange={handleImageChange}
                    />
                </div>
                <button type="submit">Register</button>
            </form>
        </div>
    );
}
