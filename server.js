
const next = require('next')
const express = require('express')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '172.17.16.7'
const port = 3000

// Initialize Next.js
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
    const server = express()

    // Disable WebSocket upgrade
    server.on('upgrade', (req, socket, head) => {
        socket.destroy()
    })

    // Handle all requests through Next.js
    server.all('*', (req, res) => {
        return handle(req, res)
    })

    // Start server
    server.listen(port, hostname, () => {
        console.log(`> Ready on http://${hostname}:${port}`)
    })
})