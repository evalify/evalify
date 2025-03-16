/**
 * @swagger
 * /api/auth/signin:
 *   post:
 *     summary: Sign in user
 *     description: Authenticates a user using credentials
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Invalid credentials
 * 
 * /api/auth/signout:
 *   post:
 *     summary: Sign out user
 *     description: Ends the user's session
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Successfully signed out
 * 
 * /api/auth/session:
 *   get:
 *     summary: Get session
 *     description: Retrieves the current user's session information
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Session information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 */

import { handlers } from '@/lib/auth/auth';

export const {GET, POST} = handlers