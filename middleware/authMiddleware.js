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
            res.status(401).json({ 
                success: false, 
                message: "Not authorized, token failed",
                error: error.message 
            });
        }
    } else {
        res.status(401).json({ 
            success: false, 
            message: "No token, not authorized" 
        });
    }
};

module.exports = { protect };