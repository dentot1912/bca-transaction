"use client";

import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [paymentToInput, setPaymentToInput] = useState('');
  
  const [amount, setAmount] = useState('');
  const [paymentTo, setPaymentTo] = useState('');
  const [timestamp, setTimestamp] = useState('');

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
            <img src="/bca-bank-central-asia-logo.svg" alt="BCA Logo" className={styles.bcaLogoImage} />
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
                <div className={styles.detailValue}>GOPAY</div>
              </div>

              <div className={`${styles.detailRow} ${styles.borderedBottom} ${styles.borderedTop}`}>
                <div className={styles.detailLabel}>RRN</div>
                <div className={styles.detailValue}>
                  328749151
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
