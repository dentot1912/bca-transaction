"use client";

import { useState, useRef } from 'react';
import jsQR from 'jsqr';
import styles from './page.module.css';

export default function Home() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [paymentToInput, setPaymentToInput] = useState('');
  const [acquirerInput, setAcquirerInput] = useState('BCA');
  
  const [amount, setAmount] = useState('');
  const [paymentTo, setPaymentTo] = useState('');
  const [acquirer, setAcquirer] = useState('BCA');
  const [timestamp, setTimestamp] = useState('');
  const [rrn, setRrn] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          const tags = parseEMVQR(code.data);
          
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

  if (!isSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.mobileFrame}>
          <div className={styles.formContainer}>
            <div className={styles.formCard}>
              <div className={styles.formHeader}>
                <img src="/bca-bank-central-asia-logo.svg" alt="BCA" className={styles.bcaLogoSmall} />
                <h2 className={styles.formTitle}>Receipt Generator</h2>
                <p className={styles.formSubtitle}>Simulasi struk transfer m-BCA</p>
              </div>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className={styles.submitBtn}
                    style={{ backgroundColor: '#f0f0f0', color: '#0066AE', border: '1px solid #0066AE' }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                    <span style={{ verticalAlign: 'middle' }}>Scan QRIS</span>
                  </button>
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Pembayaran ke</label>
                  <input 
                    type="text" 
                    value={paymentToInput} 
                    onChange={(e) => setPaymentToInput(e.target.value)}
                    placeholder="Contoh: Kajue Interior, WR TR"
                    className={styles.inputField}
                    required
                  />
                  <div className={styles.shortcutContainer}>
                    <button 
                      type="button" 
                      onClick={() => setPaymentToInput('Ciemilan Payakumbuh')}
                      className={styles.shortcutBtn}
                      style={{ flex: 'none' }}
                    >
                      Ciemilan Payakumbuh
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Pengakuisisi</label>
                  <input 
                    type="text" 
                    value={acquirerInput} 
                    onChange={(e) => setAcquirerInput(e.target.value)}
                    placeholder="Contoh: BCA, MANDIRI"
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
                    placeholder="Contoh: 50,000"
                    className={styles.inputField}
                    required
                  />
                  <div className={styles.shortcutContainer}>
                    {[1000, 5000, 10000, 20000, 50000, 100000].map(val => (
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
                
                <button 
                  type="submit"
                  className={styles.submitBtn}
                >
                  Buat Struk
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
