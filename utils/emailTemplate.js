const orderEmailTemplate = (paymentId, amount, items = []) => {
    const itemRows = items.map(item => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 15px 0;">
                <p style="margin: 0; font-weight: 600; color: #1a1a1a; font-size: 15px;">${item.name}</p>
                <p style="margin: 5px 0 0; color: #888; font-size: 13px;">Qty: ${item.qty}</p>
            </td>
            <td style="padding: 15px 0; text-align: right; vertical-align: top;">
                <p style="margin: 0; font-weight: 600; color: #1a1a1a; font-size: 15px;">₹${item.price.toLocaleString('en-IN')}</p>
            </td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Plus Jakarta Sans', Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
            
            <div style="background-color: #000000; padding: 40px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 4px; font-weight: 700; text-transform: uppercase;">ShopLane</h1>
                <p style="color: #888; margin-top: 10px; font-size: 12px; letter-spacing: 2px;">PREMIUM FASHION DESTINATION</p>
            </div>

            <div style="padding: 40px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="display: inline-block; background-color: #e8f5e9; color: #2e7d32; padding: 8px 20px; border-radius: 50px; font-size: 12px; font-weight: 700; margin-bottom: 20px;">
                        ORDER CONFIRMED
                    </div>
                    <h2 style="color: #1a1a1a; margin: 0; font-size: 26px; font-weight: 700;">Thank you for your order.</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 15px;">
                        Hi there, we've received your order and our team is already working on getting it to your doorstep.
                    </p>
                </div>

                <div style="border-top: 2px solid #1a1a1a; margin-top: 40px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="text-align: left; padding: 20px 0 10px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Product</th>
                                <th style="text-align: right; padding: 20px 0 10px; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td style="padding: 25px 0 5px; font-size: 16px; color: #888;">Subtotal</td>
                                <td style="padding: 25px 0 5px; text-align: right; font-size: 16px; color: #1a1a1a;">₹${amount.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; font-size: 16px; color: #888;">Shipping</td>
                                <td style="padding: 5px 0; text-align: right; font-size: 16px; color: #2e7d32; font-weight: 600;">FREE</td>
                            </tr>
                            <tr>
                                <td style="padding: 20px 0; font-size: 20px; font-weight: 700; color: #1a1a1a;">Total Paid</td>
                                <td style="padding: 20px 0; text-align: right; font-size: 22px; font-weight: 700; color: #ff3f6c;">₹${amount.toLocaleString('en-IN')}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="text-align: center; margin: 40px 0;">
                    <a href="http://localhost:5173/orders" style="background-color: #000000; color: #ffffff; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 1px;">TRACK YOUR ORDER</a>
                </div>

                <div style="background-color: #f9f9f9; border-radius: 12px; padding: 20px; border: 1px solid #eee;">
                    <p style="margin: 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">Transaction Method</p>
                    <p style="margin: 0; font-size: 14px; color: #1a1a1a; font-weight: 600;">Razorpay Secure Payment</p>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #888;">ID: ${paymentId}</p>
                </div>
            </div>

            <div style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; font-size: 14px; color: #1a1a1a; font-weight: 600;">Need Help?</p>
                <p style="margin: 5px 0 15px; font-size: 13px; color: #888;">Contact our 24/7 concierge at support@shoplane.com</p>
                <div style="margin-bottom: 20px;">
                    <span style="margin: 0 10px; color: #ccc;">•</span>
                    <a href="#" style="color: #888; text-decoration: none; font-size: 12px;">Privacy Policy</a>
                    <span style="margin: 0 10px; color: #ccc;">•</span>
                    <a href="#" style="color: #888; text-decoration: none; font-size: 12px;">Terms of Service</a>
                </div>
                <p style="margin: 0; font-size: 11px; color: #bbb; letter-spacing: 1px;">© 2026 SHOPLANE INC. INDORE, INDIA.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { orderEmailTemplate };