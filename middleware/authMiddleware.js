const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token = req.headers.authorization;

    if (token && token.startsWith("Bearer")) {
        try {
            token = token.split(" ")[1]; 
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = { 
                id: decoded.id,
                email: decoded.email 
            }; 
            
            next();
        } catch (error) {
            console.error("Token verification failed:", error);
            res.status(401).json({ message: "Not authorized, token failed" });
        }
    } else {
        res.status(401).json({ message: "No token, not authorized" });
    }
};

module.exports = { protect };