const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo123';

app.use(bodyParser.json());
app.use(express.static('public'));

// ✅ Rota manual para garantir que / funcione corretamente
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Configuração do transporte de email
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Rota para gerar pagamento Pix
app.post('/api/gerar-pix', async (req, res) => {
  try {
    const { nome, documento, email } = req.body;

    if (!nome || !documento || !email) {
      return res.status(400).json({ erro: "Campos obrigatórios não informados." });
    }

    const response = await axios.post(
      'https://expfypay.com/api/v1/payments',
      {
        amount: 20.00,
        description: "Acesso à Live",
        external_id: `live_${Date.now()}`,
        customer: { name: nome, document: documento, email },
        callback_url: "https://seudominio.com/webhook", // atualize com seu domínio real
        split_email: process.env.SPLIT_EMAIL,
        split_percentage: "10"
      },
      {
        headers: {
          "X-Public-Key": process.env.PUBLIC_KEY,
          "X-Secret-Key": process.env.SECRET_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ qr_code_url: response.data.qr_code_url });
  } catch (error) {
    console.error("Erro ao gerar Pix:", error.response?.data || error.message);
    res.status(500).json({ erro: "Erro ao gerar pagamento Pix." });
  }
});

// Webhook da Expfy: confirmação de pagamento
app.post('/webhook', (req, res) => {
  const { customer } = req.body;

  const token = jwt.sign(
    {
      email: customer.email,
      acessoLiberado: true
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const linkDeAcesso = `https://seudominio.com/live?token=${token}`; // substitua por seu domínio

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customer.email,
    subject: "🎉 Seu acesso à live foi liberado!",
    html: `
      <h2>Olá ${customer.name}!</h2>
      <p>Seu pagamento foi confirmado e o acesso à nossa live está liberado.</p>
      <p><a href="${linkDeAcesso}" target="_blank">Clique aqui para assistir à live</a></p>
      <p>Este link expira em 2 horas. Aproveite!</p>
      <hr>
      <small>Não compartilhe este link. Ele é exclusivo para você.</small>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Erro ao enviar e-mail:", err);
    } else {
      console.log(`E-mail enviado para ${customer.email}: ${info.response}`);
    }
  });

  res.status(200).send("Webhook recebido");
});

// Página da live protegida por token
app.get('/live', (req, res) => {
  const token = req.query.token;

  if (!token) return res.status(401).send("Token ausente");

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.acessoLiberado) {
      res.sendFile(path.join(__dirname, 'public/live.html'));
    } else {
      res.status(403).send("Acesso negado");
    }
  } catch (err) {
    res.status(401).send("Token inválido ou expirado");
  }
});

// ✅ Escuta na porta fornecida pelo Render
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
