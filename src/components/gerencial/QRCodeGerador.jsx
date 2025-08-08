import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
//opção de impressão de QRCode para o cardápio online
const QRCodeGerador = ({ slug }) => {
  const [tipoImpressao, setTipoImpressao] = useState('80mm');
  const [quantidade, setQuantidade] = useState('');
  const printRef = useRef();
  const url = `https://athospp.com.br/${slug}`;

  const handlePrint = () => {
    const printContents = printRef.current.innerHTML;
    const win = window.open('', '', 'height=700,width=900');
    win.document.write('<html><head><title>Imprimir QRCode</title>');
    win.document.write('<style>body{margin:0;padding:0 2mm;font-weight:bold;font-size:14px;font-family:Arial,Helvetica,sans-serif;} .qrcode-print-a4{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;} .qrcode-item{display:flex;flex-direction:column;align-items:center;margin:16px;} .qrcode-link{font-size:14px;font-weight:bold;word-break:break-all;text-align:center;margin-top:8px;font-family:Arial,Helvetica,sans-serif;} .qrcode-print-80mm{display:flex;flex-direction:column;align-items:center;width:76mm;margin:0 auto;} @media print{@page{size:80mm auto;margin:0;} body{font-weight:bold;font-size:14px;font-family:Arial,Helvetica,sans-serif;}}</style>');
    win.document.write('</head><body>');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        <label className="font-semibold">Tipo de impressão:</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="tipo" value="a4" checked={tipoImpressao === 'a4'} onChange={() => setTipoImpressao('a4')} />
            Folha A4
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="tipo" value="80mm" checked={tipoImpressao === '80mm'} onChange={() => setTipoImpressao('80mm')} />
            Cupom 80mm
          </label>
        </div>
        {tipoImpressao === 'a4' && (
          <div className="flex items-center gap-2 mt-2">
            <label>Quantidade de QRCodes na folha:</label>
            <input type="number" min={1} max={30} value={quantidade} onChange={e => setQuantidade(e.target.value.replace(/[^0-9]/g, ''))} className="w-16 border rounded px-2 py-1" placeholder="Ex: 5" />
          </div>
        )}
      </div>
      <div ref={printRef} className="my-4">
        {tipoImpressao === 'a4' ? (
          <div className="qrcode-print-a4 max-h-[60vh] overflow-y-auto p-2 border rounded bg-gray-50 flex flex-wrap gap-4 justify-center">
            {Number(quantidade) > 0 && Array.from({ length: Number(quantidade) }).map((_, idx) => (
              <div className="qrcode-item" key={idx}>
                <QRCode value={url} size={120} />
                <div className="qrcode-link">{url}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="qrcode-print-80mm" style={{ width: 240, margin: '0 auto', padding: 0, textAlign: 'center' }}>
            <div style={{ margin: 0, padding: '8px 0', background: '#fff' }}>
              <QRCode value={url} size={180} />
              <div className="qrcode-link" style={{ fontSize: 11, marginTop: 4 }}>{url}</div>
            </div>
          </div>
        )}
      </div>
      <button
        onClick={handlePrint}
        className="mt-4 px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition sticky bottom-2"
        disabled={tipoImpressao === 'a4' && (!quantidade || Number(quantidade) < 1)}
      >
        Imprimir
      </button>
    </div>
  );
};

export default QRCodeGerador; 