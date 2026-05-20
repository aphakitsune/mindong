const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg'); 
const pg = require('pg');
const path = require('path');

const app = express();
// const PORT = 3000;
const PORT = process.env.PORT || 3000;

// 1. Cấu hình Adapter kết nối PostgreSQL trực tiếp trong code chạy Server
const connectionString = "postgresql://neondb_owner:npg_V4tK2YuAHRrB@ep-soft-truth-ao2tn4fj-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Khởi tạo Prisma Client sử dụng bộ adapter đã thiết lập
const prisma = new PrismaClient({ adapter });

// Cấu hình để Server đọc được dữ liệu JSON và Form gửi lên
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cho phép Server hiển thị các file giao diện HTML của bạn công khai
app.use(express.static(path.join(__dirname)));


// ==========================================
// 1. API ĐĂNG NHẬP (Dùng cho file index.html)
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại!' });
        }

        // Vào Database Neon tìm kiếm xem có khách hàng mang số điện thoại này không
        const customer = await prisma.customer.findUnique({
            where: { phone: phone }
        });

        if (customer) {
            // Đăng nhập thành công, trả về dữ liệu khách hàng
            return res.json({ success: true, user: customer });
        } else {
            return res.status(404).json({ success: false, message: 'Số điện thoại không tồn tại trên hệ thống!' });
        }
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau!' });
    }
});

// ==========================================
// 2. API THÊM MỚI KHÁCH HÀNG (Dùng cho admin.html)
// ==========================================
app.post('/api/customers', async (req, res) => {
    try {
        const { name, phone, cccd, goc, phaiTT, hanTT } = req.body;

        // Lưu thông tin khách hàng mới trực tiếp vào Database Neon
        const newCustomer = await prisma.customer.create({
            data: {
                name,
                phone,
                cccd,
                goc: parseInt(goc),
                phaiTT: parseInt(phaiTT),
                hanTT
            }
        });

        res.json({ success: true, data: newCustomer });
    } catch (error) {
        console.error("Lỗi thêm khách hàng:", error);
        res.status(500).json({ success: false, message: 'Không thể thêm khách hàng (Số điện thoại này đã tồn tại)!' });
    }
});

// ==========================================
// 3. API LẤY DANH SÁCH KHÁCH HÀNG (Dùng hiển thị lên bảng admin.html)
// ==========================================
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: { id: 'desc' }
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi lấy dữ liệu từ database!' });
    }
});

// ==========================================
// 4. API CẬP NHẬT/SỬA THÔNG TIN KHÁCH HÀNG (Dùng cho admin.html)
// ==========================================
app.put('/api/customers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, cccd, goc, phaiTT, hanTT } = req.body;

        // Tiến hành cập nhật thông tin trong Database Neon theo ID khách hàng
        const updatedCustomer = await prisma.customer.update({
            where: { id: parseInt(id) },
            data: {
                name,
                phone,
                cccd,
                goc: parseInt(goc),
                phaiTT: parseInt(phaiTT),
                hanTT
            }
        });

        res.json({ success: true, message: 'Cập nhật thông tin thành công!', data: updatedCustomer });
    } catch (error) {
        console.error("Lỗi cập nhật khách hàng:", error);
        res.status(500).json({ success: false, message: 'Số điện thoại vừa sửa đã tồn tại hoặc lỗi hệ thống!' });
    }
});


// ==========================================
// API CẤU HÌNH TÀI KHOẢN VÀ MÃ QR (Bảng Config)
// ==========================================

// 1. API Lấy thông tin cấu hình hiện tại (Trả về bản ghi đầu tiên)
app.get('/api/config', async (req, res) => {
    try {
        let config = await prisma.config.findFirst();
        // Nếu database chưa có dữ liệu cấu hình nào, tạo dữ liệu mặc định để tránh lỗi giao diện
        if (!config) {
            config = await prisma.config.create({
                data: {
                    bankNumber: "8865643797",
                    bankName: "VPBANK",
                    ownerName: "LU CHI AN",
                    qrCodeUrl: ""
                }
            });
        }
        res.json(config);
    } catch (error) {
        console.error("Lỗi lấy dữ liệu Config:", error);
        res.status(500).json({ success: false, message: 'Lỗi lấy cấu hình từ database!' });
    }
});

// 2. API Cập nhật thông tin cấu hình (Lưu đè hoặc tạo mới)
app.post('/api/config', async (req, res) => {
    try {
        const { bankNumber, bankName, ownerName, qrCodeUrl } = req.body;
        
        // Tìm bản ghi hiện tại
        const existingConfig = await prisma.config.findFirst();

        let updatedConfig;
        if (existingConfig) {
            // Nếu đã có, tiến hành Update theo ID bản ghi đó
            updatedConfig = await prisma.config.update({
                where: { id: existingConfig.id },
                data: { bankNumber, bankName, ownerName, qrCodeUrl }
            });
        } else {
            // Nếu chưa có (trường hợp DB trống), tạo mới
            updatedConfig = await prisma.config.create({
                data: { bankNumber, bankName, ownerName, qrCodeUrl }
            });
        }

        res.json({ success: true, message: 'Cập nhật tài khoản doanh nghiệp thành công!', data: updatedConfig });
    } catch (error) {
        console.error("Lỗi lưu dữ liệu Config:", error);
        res.status(500).json({ success: false, message: 'Không thể lưu dữ liệu cấu hình!' });
    }
});


// Mở cổng lắng nghe Server
app.listen(PORT, () => {
    console.log(`Server của bạn đang chạy mượt mà tại: http://localhost:${PORT}`);
});