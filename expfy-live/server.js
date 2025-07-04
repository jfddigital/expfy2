const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Rota para gerar Pix via API EXPFY
app.post("/api/gerar-pix", async (req, res) => {
  const { nome, valor } = req.body;

  try {
    const resposta = await axios.post(
      "https://expfypay.com/api/v1/payments",
      {
        amount: parseFloat(valor),
        description: `Pagamento via Pix gerado para ${nome}`,
        customer: {
          name: nome,
          document: "000.000.000-00",
          email: "cliente@email.com"
        },
        external_id: `pedido_${Date.now()}`,
        callback_url: "https://seusite.com.br/webhook",
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

    res.json(resposta.data);
  } catch (err) {
    console.error("Erro ao gerar Pix:", err.response?.data || err.message);
    res.status(500).json({ erro: "Erro ao gerar Pix. Tente novamente." });
  }
});

// Rota raiz (opcional)
app.get("/", (req, res) => {
  res.send("Servidor Expfy Live está ativo! 🚀");
});

// Inicia o servidor
app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
