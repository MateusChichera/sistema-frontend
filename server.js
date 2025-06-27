import express from 'express';
import path from 'path';

const app = express();
const port = process.env.PORT || 5173;

// Define o caminho absoluto da pasta atual
const __dirname = path.resolve();

// Serve os arquivos estáticos da pasta dist (build do Vite)
app.use(express.static(path.join(__dirname, 'dist')));

// Serve o index.html para qualquer rota (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend rodando na porta ${port}`);
});
