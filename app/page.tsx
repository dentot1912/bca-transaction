"use client";

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import styles from './page.module.css';

export default function Home() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [paymentToInput, setPaymentToInput] = useState('');
  const [acquirerInput, setAcquirerInput] = useState('BCA');

  const [amount, setAmount] = useState('');
  const [paymentTo, setPaymentTo] = useState('');
  const [acquirer, setAcquirer] = useState('BCA');
  const [timestamp, setTimestamp] = useState('');
  const [rrn, setRrn] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningRef = useRef(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const parseEMVQR = (payload: string) => {
    let index = 0;
    const tags: Record<string, string> = {};

    while (index < payload.length) {
      const tag = payload.substring(index, index + 2);
      index += 2;
      if (index >= payload.length) break;

      const lengthStr = payload.substring(index, index + 2);
      index += 2;

      const length = parseInt(lengthStr, 10);
      if (isNaN(length)) break;

      const value = payload.substring(index, index + length);
      index += length;

      tags[tag] = value;
    }
    return tags;
  };

  const startCamera = async () => {
    setIsScanning(true);
    scanningRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
      setIsScanning(false);
      scanningRef.current = false;
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const tick = () => {
    if (!scanningRef.current) return;
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            stopCamera();
            handleQRResult(code.data);
            return;
          }
        }
      }
    }
    if (scanningRef.current) {
      requestAnimationFrame(tick);
    }
  };

  const handleQRResult = (data: string) => {
    const tags = parseEMVQR(data);

    // Tag 59 is Merchant Name
    if (tags['59']) {
      setPaymentToInput(tags['59']);
    }

    // Determine Acquirer from Tags 26-51
    const acquirerMap: Record<string, string> = {
      'ID.CO.BCA.WWW': 'BCA',
      'ID.CO.MANDIRI.WWW': 'MANDIRI',
      'ID.CO.BNI.WWW': 'BNI',
      'ID.CO.BRI.WWW': 'BRI',
      'ID.CO.CIMB.WWW': 'CIMB NIAGA',
      'ID.CO.DANA.WWW': 'DANA',
      'ID.CO.GOPAY.WWW': 'GOPAY',
      'ID.CO.OVO.WWW': 'OVO',
      'ID.CO.SHOPEE.WWW': 'SHOPEEPAY',
      'ID.CO.LINKAJA.WWW': 'LINKAJA'
    };

    let foundAcquirer = '';
    for (let i = 26; i <= 51; i++) {
      const tag = i.toString().padStart(2, '0');
      if (tags[tag]) {
        const subTags = parseEMVQR(tags[tag]);
        if (subTags['00']) {
          const guid = subTags['00'].toUpperCase();
          if (acquirerMap[guid]) {
            foundAcquirer = acquirerMap[guid];
          } else if (guid.startsWith('ID.CO.') && guid.endsWith('.WWW')) {
            const parts = guid.split('.');
            if (parts.length >= 3 && parts[2] !== 'QRIS') {
              foundAcquirer = parts[2].toUpperCase();
            }
          }
        }
      }
    }
    if (foundAcquirer) {
      setAcquirerInput(foundAcquirer);
    }

    alert('QRIS Berhasil dipindai');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          handleQRResult(code.data);
          if (isScanning) stopCamera();
        } else {
          alert('Gambar tidak mengandung QR code yang valid');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  const addAmount = (valueToAdd: number) => {
    const currentVal = parseInt(amountInput.replace(/\D/g, ''), 10) || 0;
    const newVal = currentVal + valueToAdd;
    setAmountInput(newVal.toLocaleString('en-US'));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setAmountInput('');
      return;
    }
    // Add thousand separators
    const formatted = parseInt(rawValue, 10).toLocaleString('en-US');
    setAmountInput(formatted);
  };

  const formatAmount = (val: string) => {
    const num = parseFloat(val.replace(/,/g, ''));
    if (isNaN(num)) return "0.00";
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput || !paymentToInput) return;

    setAmount(formatAmount(amountInput));
    setPaymentTo(paymentToInput);
    setAcquirer(acquirerInput);

    // Format date like: "28 Mar 2026 07:54:54"
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = now.getDate().toString().padStart(2, '0');
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    setTimestamp(`${day} ${month} ${year} ${hours}:${minutes}:${seconds}`);

    const randomRrn = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    setRrn(randomRrn);

    setIsSubmitted(true);

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.log("Error attempting to enable fullscreen:", err);
        });
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleSelesai = () => {
    setIsSubmitted(false);
    setAmountInput('');
    setPaymentToInput('');
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.log("Error attempting to exit fullscreen:", err);
        });
      }
    } catch (e) {
      console.log(e);
    }
  };

  if (isScanning) {
    return (
      <div className={styles.container}>
        <div className={styles.mobileFrame} style={{ backgroundColor: '#000' }}>
          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Overlay */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <div style={{
                width: '260px', height: '260px',
                position: 'relative',
                boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.65)',
                borderRadius: '16px'
              }}>
                {/* Corner markers */}
                <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '40px', height: '40px', borderTop: '4px solid #fff', borderLeft: '4px solid #fff', borderTopLeftRadius: '16px' }}></div>
                <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '40px', height: '40px', borderTop: '4px solid #fff', borderRight: '4px solid #fff', borderTopRightRadius: '16px' }}></div>
                <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '40px', height: '40px', borderBottom: '4px solid #fff', borderLeft: '4px solid #fff', borderBottomLeftRadius: '16px' }}></div>
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '40px', height: '40px', borderBottom: '4px solid #fff', borderRight: '4px solid #fff', borderBottomRightRadius: '16px' }}></div>

                {/* Scanning animation line */}
                <div style={{
                  width: '100%', height: '2px', backgroundColor: '#0066AE',
                  position: 'absolute', top: '50%', boxShadow: '0 0 10px #0066AE',
                  animation: 'scan 2s infinite ease-in-out'
                }}></div>
              </div>
              <p style={{ color: 'white', marginTop: '40px', fontSize: '15px', fontWeight: '500', letterSpacing: '0.5px' }}>
                Arahkan kamera ke QR Code
              </p>
            </div>

            {/* Header controls */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', padding: '20px', zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={stopCamera}
                style={{
                  background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>Scan QRIS</div>
              <div style={{ width: '44px' }}></div>
            </div>

            {/* Upload fallback */}
            <div style={{ position: 'absolute', bottom: '40px', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 20 }}>
              <label style={{
                background: 'rgba(255,255,255,0.2)', padding: '12px 24px', backdropFilter: 'blur(4px)',
                borderRadius: '24px', color: 'white', display: 'flex', gap: '10px', alignItems: 'center',
                cursor: 'pointer', fontWeight: '500', fontSize: '14px', border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Upload dari Galeri
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <style jsx>{`
              @keyframes scan {
                0% { top: 10%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 90%; opacity: 0; }
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  if (!isSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.mobileFrame}>
          <div className={styles.formContainer}>
            <div className={styles.appHeader}>
              <button type="button" className={styles.receiptBackBtn} style={{ padding: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              <h2 className={styles.appHeaderTitle}>m-Transfer</h2>
            </div>
            
            <div className={styles.formContent}>
              <button
                type="button"
                className={styles.scanButtonLarge}
                onClick={startCamera}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                </svg>
                <span>Scan QRIS</span>
              </button>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className={styles.inputCard}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Pembayaran ke</label>
                    <input 
                      type="text" 
                      value={paymentToInput} 
                      onChange={(e) => setPaymentToInput(e.target.value)}
                      placeholder="Nama Merchant"
                      className={styles.inputField}
                      required
                    />
                    <div style={{ marginTop: '12px' }}>
                      <div className={styles.shortcutLabel}>Favorit:</div>
                      <div className={styles.shortcutContainer}>
                        <button 
                          type="button" 
                          onClick={() => setPaymentToInput('Ciemilan Payakumbuh')}
                          className={styles.shortcutBtn}
                        >
                          Ciemilan Payakumbuh
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Pengakuisisi</label>
                    <input 
                      type="text" 
                      value={acquirerInput} 
                      onChange={(e) => setAcquirerInput(e.target.value)}
                      placeholder="BCA / MANDIRI / etc"
                      className={styles.inputField}
                      required
                    />
                  </div>
                  
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Nominal (IDR)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={amountInput} 
                      onChange={handleAmountChange}
                      placeholder="0"
                      className={styles.inputField}
                      required
                    />
                    <div style={{ marginTop: '12px' }}>
                      <div className={styles.shortcutLabel}>Cepat:</div>
                      <div className={styles.shortcutContainer}>
                        {[10000, 20000, 50000, 100000].map(val => (
                          <button 
                            key={val} 
                            type="button" 
                            onClick={() => addAmount(val)}
                            className={styles.shortcutBtn}
                          >
                            +{val.toLocaleString('id-ID')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className={styles.submitButtonLarge}
                >
                  SEND
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.mobileFrame}>
        {/* Watermark Background */}
        <div className={styles.watermark}></div>

        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <button type="button" className={styles.backButton} onClick={handleSelesai}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <img src="/bca-bank-central-asia-logo.png" alt="BCA Logo" className={styles.bcaLogoImage} />
          </div>

          <div className={styles.separator}></div>

          {/* Success Section */}
          <div className={styles.successSection}>
            <div className={styles.checkIconContainer}>
              <div className={styles.checkIconInner}>
                <svg
                  width="42"
                  height="42"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>
            <div className={styles.title}>Pembayaran QRIS Berhasil</div>
            <div className={styles.date}>{timestamp}</div>
            <div className={styles.amount}>IDR {amount}</div>
          </div>

          {/* Details Section */}
          <div className={styles.detailsSection}>
            <div className={`${styles.detailRow} ${styles.borderedBottom}`}>
              <div className={styles.detailLabel}>Pembayaran ke</div>
              <div className={`${styles.detailValue}`}>
                {paymentTo}
              </div>
            </div>

            <div className={styles.detailRowGroup}>
              <div className={styles.detailRow}>
                <div className={styles.detailLabel}>Pengakuisisi</div>
                <div className={styles.detailValue}>{acquirer}</div>
              </div>

              <div className={`${styles.detailRow} ${styles.borderedBottom} ${styles.borderedTop}`}>
                <div className={styles.detailLabel}>RRN</div>
                <div className={styles.detailValue}>
                  {rrn}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.lihatDetail}>
            Lihat Detail <span className={styles.chevronDown}></span>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footerWrapper}>
          <div className={styles.footer}>
            <button className={styles.iconButton} aria-label="Share">
              <svg viewBox="0 0 24 24">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z" />
              </svg>
            </button>
            <button className={styles.iconButton} aria-label="Download">
              <svg viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
            </button>
            <button className={styles.selesaiBtn} onClick={handleSelesai}>Selesai</button>
          </div>
        </div>
      </div>
    </div>
  );
}
