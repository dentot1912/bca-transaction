"use client";

import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import styles from './page.module.css';

export default function Home() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [paymentToInput, setPaymentToInput] = useState('FFROKKY, Fashion');
  const [acquirerInput, setAcquirerInput] = useState('GOPAY');
  const [merchantCity, setMerchantCity] = useState('PAYAKUMBUH, 26218, ID');
  const [merchantPan, setMerchantPan] = useState('9360091435851418084');
  const [merchantRef, setMerchantRef] = useState('014662486068');
  const [sourceAccount, setSourceAccount] = useState('614 - 538 - 4188');
  const [sourceAccountType, setSourceAccountType] = useState('TAHAPAN XPRESI');
  const [showKeyboard, setShowKeyboard] = useState(true);

  const [amount, setAmount] = useState('');
  const [paymentTo, setPaymentTo] = useState('');
  const [acquirer, setAcquirer] = useState('BCA');
  const [timestamp, setTimestamp] = useState('');
  const [rrn, setRrn] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const handleKeypadPress = (val: string) => {
    const currentClean = amountInput.replace(/\D/g, '');
    let nextVal = currentClean;
    if (val === '000') {
      if (currentClean && currentClean !== '0') {
        nextVal = currentClean + '000';
      }
    } else {
      if (currentClean === '0') {
        nextVal = val;
      } else {
        nextVal = currentClean + val;
      }
    }
    if (nextVal.length > 12) return; // Prevent overflow
    const num = parseInt(nextVal, 10);
    setAmountInput(isNaN(num) || num === 0 ? '' : num.toLocaleString('en-US'));
  };

  const handleKeypadBackspace = () => {
    const currentClean = amountInput.replace(/\D/g, '');
    if (!currentClean) return;
    const nextVal = currentClean.slice(0, -1);
    if (!nextVal) {
      setAmountInput('');
    } else {
      const num = parseInt(nextVal, 10);
      setAmountInput(num.toLocaleString('en-US'));
    }
  };

  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningRef = useRef(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  const toggleFlash = async () => {
    if (!videoTrackRef.current) {
      showToast("Kamera belum aktif", 'info');
      return;
    }

    try {
      const track = videoTrackRef.current;
      const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;

      if (!capabilities.torch && !('torch' in capabilities)) {
        // Many browsers on desktop don't have torch capability
        showToast("Flashlight tidak didukung pada perangkat ini", 'info');
        return;
      }

      const nextState = !isFlashOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsFlashOn(nextState);
    } catch (err) {
      console.error("Error toggling flash:", err);
      showToast("Gagal mengubah status flashlight", 'error');
    }
  };

  const startCamera = async () => {
    setIsScanning(true);
    setIsFlashOn(false);
    scanningRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrackRef.current = videoTrack;
        const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
        if (capabilities.torch || 'torch' in capabilities) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Error accessing camera: ", err);
      showToast("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.", 'error');
      setIsScanning(false);
      scanningRef.current = false;
    }
  };

  const stopCamera = () => {
    scanningRef.current = false;
    setIsFlashOn(false);
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
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

    // Tag 60 (City), 61 (Postal Code), 58 (Country Code)
    const city = tags['60'] || 'PAYAKUMBUH';
    const postal = tags['61'] || '26218';
    const country = tags['58'] || 'ID';
    setMerchantCity(`${city}, ${postal}, ${country}`);

    // Tag 54 (Transaction Amount if dynamic QR)
    if (tags['54']) {
      const parsedAmount = parseFloat(tags['54']);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        setAmountInput(parsedAmount.toLocaleString('en-US'));
      }
    }

    // Determine Acquirer from Tags 26-51 (Merchant Account Information)
    const nnsMap: Record<string, string> = {
      '93600002': 'BRI',
      '93600008': 'MANDIRI',
      '93600009': 'BNI',
      '93600013': 'PERMATA',
      '93600014': 'BCA',
      '93600022': 'CIMB NIAGA',
      '93600110': 'BJB',
      '93600111': 'BANK DKI',
      '93600147': 'MUAMALAT',
      '93600200': 'BTN',
      '93600213': 'BTPN / JENIUS',
      '93600426': 'BANK MEGA',
      '93600451': 'BSI',
      '93600501': 'BCA DIGITAL (BLU)',
      '93600503': 'NOBU',
      '93600542': 'BANK JAGO',
      '93600567': 'ALLO BANK',
      '93600815': 'INTERACTIVE / SPEEDCASH',
      '93600822': 'ASTRAPAY',
      '93600911': 'LINKAJA',
      '93600912': 'OVO',
      '93600914': 'GOPAY',
      '93600915': 'DANA',
      '93600916': 'KASPRO',
      '93600917': 'PAYTREN',
      '93600918': 'SHOPEEPAY',
      '93600919': 'ISAKU',
      '93600920': 'DOKU'
    };

    const guidMap: Record<string, string> = {
      'ID.CO.BCA.WWW': 'BCA',
      'ID.CO.MANDIRI.WWW': 'MANDIRI',
      'ID.CO.BNI.WWW': 'BNI',
      'ID.CO.BRI.WWW': 'BRI',
      'ID.CO.CIMB.WWW': 'CIMB NIAGA',
      'ID.CO.DANA.WWW': 'DANA',
      'ID.CO.GOPAY.WWW': 'GOPAY',
      'ID.CO.GO-PAY.WWW': 'GOPAY',
      'ID.CO.OVO.WWW': 'OVO',
      'ID.CO.SHOPEE.WWW': 'SHOPEEPAY',
      'ID.CO.SHOPEEPAY.WWW': 'SHOPEEPAY',
      'ID.CO.LINKAJA.WWW': 'LINKAJA',
      'ID.CO.TELKOM.LINKAJA': 'LINKAJA',
      'ID.CO.ASTRAPAY.WWW': 'ASTRAPAY',
      'ID.CO.NOBU.WWW': 'NOBU',
      'ID.CO.JAGO.WWW': 'BANK JAGO',
      'ID.CO.ALLOBANK.WWW': 'ALLO BANK'
    };

    let foundAcquirer = '';
    let foundPan = '';

    for (let i = 26; i <= 51; i++) {
      const tag = i.toString().padStart(2, '0');
      if (tags[tag]) {
        const subTags = parseEMVQR(tags[tag]);
        
        if (subTags['01']) {
          foundPan = subTags['01'];
          setMerchantPan(foundPan);

          // Cek berdasarkan NNS (8 digit pertama dari Merchant PAN)
          const nns8 = foundPan.substring(0, 8);
          if (nnsMap[nns8]) {
            foundAcquirer = nnsMap[nns8];
          }
        }

        if (!foundAcquirer && subTags['00']) {
          const guid = subTags['00'].toUpperCase();
          if (guidMap[guid]) {
            foundAcquirer = guidMap[guid];
          } else {
            // Regex match ID.CO.<NAME>.WWW or similar
            const match = guid.match(/ID\.(?:CO|OR)\.([A-Z0-9_-]+)(?:\.WWW)?/i);
            if (match && match[1] && match[1] !== 'QRIS') {
              foundAcquirer = match[1].replace(/[-_]/g, ' ').toUpperCase();
            }
          }
        }
      }
    }

    // Jika tag 26-51 belum menemukan acquirer, coba cek tag 51 khusus / fallback
    if (foundPan && !foundAcquirer) {
      const nns8 = foundPan.substring(0, 8);
      if (nnsMap[nns8]) {
        foundAcquirer = nnsMap[nns8];
      }
    }

    if (foundAcquirer) {
      setAcquirerInput(foundAcquirer);
    }

    // Reference from Tag 62 or random default
    if (tags['62']) {
      const addData = parseEMVQR(tags['62']);
      if (addData['01']) {
        setMerchantRef(addData['01']);
      } else if (addData['05']) {
        setMerchantRef(addData['05']);
      } else if (addData['07']) {
        setMerchantRef(addData['07']);
      }
    }
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
          showToast('Gambar tidak mengandung QR code yang valid', 'error');
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
    setIsConfirming(true);
  };

  const handleConfirmPay = () => {
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

    setIsConfirming(false);
    setIsSubmitted(true);
  };

  const handleSelesai = () => {
    setIsSubmitted(false);
    setIsConfirming(false);
    setAmountInput('');
    setPaymentToInput('');
  };

  if (isScanning) {
    return (
      <div className={styles.container}>
        <div className={styles.mobileFrame} style={{ backgroundColor: '#020b14', position: 'relative', overflow: 'hidden' }}>
          {toast && (
            <div className={styles.toastContainer}>
              <div className={`${styles.toast} ${styles[toast.type]}`}>
                {toast.type === 'success' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
                {toast.type === 'error' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                )}
                <span>{toast.message}</span>
              </div>
            </div>
          )}

          <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Dark camera backdrop gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'radial-gradient(ellipse at 50% 15%, rgba(6, 26, 46, 0.45) 0%, rgba(1, 4, 8, 0.92) 85%)',
              pointerEvents: 'none',
              zIndex: 5
            }} />

            {/* Header Navigation */}
            <div style={{
              position: 'absolute',
              left: 0,
              width: '100%',
              padding: '10px 16px',
              zIndex: 30,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button
                  onClick={stopCamera}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 19 8 12 15 5"></polyline>
                  </svg>
                </button>
                <span style={{ color: '#ffffff', fontWeight: '600', fontSize: '18px', letterSpacing: '-0.2px' }}>
                  Scan QRIS
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Image Gallery Upload Icon */}
                <label style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  flexShrink: 0
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    {/* Outer rounded rectangle frame */}
                    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Sun/circle */}
                    <circle cx="8" cy="8.5" r="2" fill="#ffffff" />
                    {/* Mountain triangle */}
                    <path d="M4 19L9.5 12.5L14 18M13 17L15.5 13.5L20 19" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>

                {/* Flashlight Toggle Button */}
                <button
                  type="button"
                  style={{
                    background: isFlashOn ? 'rgba(255, 255, 255, 0.25)' : 'none',
                    border: 'none',
                    borderRadius: '50%',
                    color: '#ffffff',
                    cursor: 'pointer',
                    padding: 0,
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease'
                  }}
                  onClick={toggleFlash}
                  title={isFlashOn ? "Matikan Flash" : "Nyalakan Flash"}
                >
                  {isFlashOn ? (
                    /* Active Torch (Lit up flash icon) */
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M13 2L4 13H11L10 22L20 10H13L13 2Z"
                        fill="#ffd700"
                        stroke="#ffffff"
                        strokeWidth="1.2"
                      />
                    </svg>
                  ) : (
                    /* Inactive / Crossed Torch icon */
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M13 2L4 13H11L10 22L20 10H13L13 2Z"
                        fill="#ffffff"
                      />
                      <line
                        x1="4"
                        y1="4"
                        x2="20"
                        y2="20"
                        stroke="#020b14"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="4"
                        y1="4"
                        x2="20"
                        y2="20"
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Single Blue Laser with Long Transparent Fading Tail */}
            <div style={{
              position: 'absolute',
              top: '60px',
              bottom: '160px',
              left: 0,
              width: '100%',
              pointerEvents: 'none',
              zIndex: 10,
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                left: 0,
                width: '100%',
                height: '180px',
                background: 'linear-gradient(to bottom, rgba(0, 162, 255, 0.42) 0%, rgba(0, 130, 255, 0.18) 30%, rgba(0, 100, 255, 0.03) 70%, transparent 100%)',
                animation: 'blueLaserScan 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
              }}>
              </div>
            </div>

            {/* Center Area QRIS SUPPORTED Branding Logo */}
            <div style={{
              position: 'absolute',
              bottom: '165px',
              left: 0,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              pointerEvents: 'none'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img
                  src="/qrislogo.png"
                  alt="QRIS"
                  style={{
                    height: '72px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: 'brightness(0) invert(0.6)',
                    marginBottom: '-20px'
                  }}
                />
                <span style={{
                  color: '#8e9ca8',
                  fontSize: '8px',
                  fontWeight: '700',
                  letterSpacing: '2px',
                  textTransform: 'uppercase'
                }}>
                  SUPPORTED
                </span>
              </div>
            </div>

            {/* Bottom Sheet: Metode QRIS Lainnya */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '16px 16px 12px 16px',
              zIndex: 35,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{
                color: '#003764',
                fontSize: '15px',
                fontWeight: '700',
                marginBottom: '14px',
                textAlign: 'center',
                letterSpacing: '-0.1px'
              }}>
                Metode QRIS Lainnya
              </div>

              {/* 3 Action Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                width: '100%'
              }}>
                {/* Bayar */}
                <button
                  type="button"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d4dde5',
                    borderRadius: '14px',
                    padding: '12px 4px 10px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Bayar Icon */}
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="6" width="14" height="14" rx="2" fill="#005ea6" />
                      <text x="3.5" y="15" fill="#ffffff" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">Rp</text>
                      <rect x="6" y="3" width="15" height="13" rx="2" stroke="#005ea6" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#444c54' }}>Bayar</span>
                </button>

                {/* Transfer */}
                <button
                  type="button"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d4dde5',
                    borderRadius: '14px',
                    padding: '12px 4px 10px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Transfer Icon */}
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V14C20 18 16.5 20 12 20C7.5 20 4 18 4 14V6Z" fill="#005ea6" />
                      <text x="6" y="13.5" fill="#ffffff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">Rp</text>
                    </svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#444c54' }}>Transfer</span>
                </button>

                {/* Tap */}
                <button
                  type="button"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #d4dde5',
                    borderRadius: '14px',
                    padding: '12px 4px 10px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Tap / Contactless Icon */}
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="13" height="14" rx="2.5" fill="#005ea6" />
                      <path d="M18 6C19.5 7.5 20.2 9.5 20.2 11.5C20.2 13.5 19.5 15.5 18 17" stroke="#005ea6" strokeWidth="2" strokeLinecap="round" />
                      <path d="M21 3.5C23.2 5.8 24.2 8.6 24.2 11.5C24.2 14.4 23.2 17.2 21 19.5" stroke="#005ea6" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#444c54' }}>Tap</span>
                </button>
              </div>
            </div>

            <style jsx>{`
              @keyframes blueLaserScan {
                0% {
                  transform: translateY(460px);
                  opacity: 0;
                }
                12% {
                  opacity: 1;
                }
                85% {
                  opacity: 1;
                }
                100% {
                  transform: translateY(-180px);
                  opacity: 0;
                }
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  if (isConfirming) {
    const formattedTotal = formatAmount(amountInput);

    return (
      <div className={styles.container}>
        <div className={styles.mobileFrame} style={{ backgroundColor: '#004c97', position: 'relative', overflow: 'hidden' }}>
          {toast && (
            <div className={styles.toastContainer}>
              <div className={`${styles.toast} ${styles[toast.type]}`}>
                {toast.type === 'success' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
                {toast.type === 'error' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                )}
                <span>{toast.message}</span>
              </div>
            </div>
          )}

          {/* Blue Gradient Header Background with Abstract Waves */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '180px',
            background: 'radial-gradient(circle at 80% 20%, #0066b3 0%, #004c97 60%, #003366 100%)',
            zIndex: 1
          }}>
            <svg style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', opacity: 0.25 }} viewBox="0 0 400 180" fill="none">
              <circle cx="360" cy="40" r="120" stroke="#ffffff" strokeWidth="35" />
              <circle cx="390" cy="20" r="170" stroke="#ffffff" strokeWidth="25" />
            </svg>
          </div>

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header: Back Chevron + Konfirmasi */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px 18px 16px',
              gap: '16px',
              marginTop: '16px'
            }}>
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 19 8 12 15 5"></polyline>
                </svg>
              </button>
              <h1 style={{
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: '600',
                margin: 0,
                letterSpacing: '-0.2px'
              }}>
                Konfirmasi
              </h1>
            </div>

            {/* Main Content White Card */}
            <div
              className="hide-scrollbar"
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden'
              }}
            >
              {/* Scrollable / Content Body */}
              <div
                className="hide-scrollbar"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '24px 20px 16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {/* Notice Text */}
                <div style={{
                  color: '#003366',
                  fontSize: '14.5px',
                  fontWeight: '700',
                  lineHeight: '1.45',
                  maxWidth: '310px',
                  margin: '0 auto 28px auto'
                }}>
                  Apakah data di bawah sudah benar dan Anda akan melanjutkan transaksi?
                </div>

                {/* Info List */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* 1. Jenis Transaksi */}
                  <div style={{ paddingBottom: '22px' }}>
                    <div style={{ color: '#8a95a5', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                      Jenis Transaksi
                    </div>
                    <div style={{ color: '#2b3036', fontSize: '16.5px', fontWeight: '600' }}>
                      Pembayaran QRIS
                    </div>
                  </div>

                  {/* 2. Pembayaran ke */}
                  <div style={{ borderTop: '1px solid #edf0f3', paddingTop: '20px', paddingBottom: '22px' }}>
                    <div style={{ color: '#8a95a5', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                      Pembayaran ke
                    </div>
                    <div style={{ color: '#2b3036', fontSize: '16.5px', fontWeight: '600' }}>
                      {paymentToInput || 'FFROKKY, Fashion'}
                    </div>
                    <div style={{ color: '#4a5568', fontSize: '13.5px', fontWeight: '600', marginTop: '4px' }}>
                      {merchantCity || 'PAYAKUMBUH, 26218, ID'}
                    </div>
                  </div>

                  {/* 3. Pengakuisisi */}
                  <div style={{ borderTop: '1px solid #edf0f3', paddingTop: '20px', paddingBottom: '22px' }}>
                    <div style={{ color: '#8a95a5', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                      Pengakuisisi
                    </div>
                    <div style={{ color: '#2b3036', fontSize: '16.5px', fontWeight: '600' }}>
                      {acquirerInput || 'GOPAY'}
                    </div>
                  </div>

                  {/* 4. Merchant PAN */}
                  <div style={{ borderTop: '1px solid #edf0f3', paddingTop: '20px', paddingBottom: '22px' }}>
                    <div style={{ color: '#8a95a5', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                      Merchant PAN
                    </div>
                    <div style={{ color: '#2b3036', fontSize: '16.5px', fontWeight: '600', letterSpacing: '0.2px' }}>
                      {merchantPan || '9360091435851418084'}
                    </div>
                  </div>

                  {/* 5. Sumber Dana */}
                  <div style={{ borderTop: '1px solid #edf0f3', paddingTop: '20px', paddingBottom: '22px' }}>
                    <div style={{ color: '#8a95a5', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                      Sumber Dana
                    </div>
                    <div style={{ color: '#2b3036', fontSize: '16.5px', fontWeight: '600' }}>
                      {sourceAccountType || 'TAHAPAN XPRESI'}
                    </div>
                    <div style={{ color: '#4a5568', fontSize: '16px', fontWeight: '600', marginTop: '4px', letterSpacing: '0.3px' }}>
                      {sourceAccount || '614 - 538 - 4188'}
                    </div>
                  </div>

                  {/* 6. Total Bayar */}
                  <div style={{ borderTop: '1px solid #edf0f3', paddingTop: '20px', paddingBottom: '22px' }}>
                    <div style={{ color: '#8a95a5', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                      Total Bayar
                    </div>
                    <div style={{ color: '#2b3036', fontSize: '17px', fontWeight: '600' }}>
                      IDR {formattedTotal}
                    </div>
                  </div>

                  {/* 7. No. Referensi */}
                  <div style={{ borderTop: '1px solid #edf0f3', paddingTop: '20px', paddingBottom: '16px' }}>
                    <div style={{ color: '#8a95a5', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
                      No. Referensi
                    </div>
                    <div style={{ color: '#2b3036', fontSize: '16.5px', fontWeight: '600' }}>
                      {merchantRef || '014662486068'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Button */}
              <div style={{
                padding: '16px 20px 24px 20px',
                backgroundColor: '#ffffff',
                boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)'
              }}>
                <button
                  type="button"
                  onClick={handleConfirmPay}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '24px',
                    border: 'none',
                    backgroundColor: '#0066AE',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0, 102, 174, 0.3)'
                  }}
                >
                  Lanjut
                </button>
              </div>
            </div>

            <style jsx>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
                width: 0px;
                background: transparent;
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  if (!isSubmitted) {
    const isReadyToContinue = !!amountInput && parseInt(amountInput.replace(/\D/g, ''), 10) > 0;

    return (
      <div className={styles.container}>
        <div className={styles.mobileFrame} style={{ backgroundColor: '#004c97', position: 'relative', overflow: 'hidden' }}>
          {toast && (
            <div className={styles.toastContainer}>
              <div className={`${styles.toast} ${styles[toast.type]}`}>
                {toast.type === 'success' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
                {toast.type === 'error' && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                )}
                <span>{toast.message}</span>
              </div>
            </div>
          )}

          {/* Blue Gradient Header Background with Abstract Waves */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '180px',
            background: 'radial-gradient(circle at 80% 20%, #0066b3 0%, #004c97 60%, #003366 100%)',
            zIndex: 1
          }}>
            {/* Soft wave arcs in background */}
            <svg style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', opacity: 0.25 }} viewBox="0 0 400 180" fill="none">
              <circle cx="360" cy="40" r="120" stroke="#ffffff" strokeWidth="35" />
              <circle cx="390" cy="20" r="170" stroke="#ffffff" strokeWidth="25" />
            </svg>
          </div>

          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Header: Back Chevron + Pembayaran QRIS */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 16px 18px 16px',
              gap: '16px',
              marginTop: '16px'
            }}>
              <button
                type="button"
                onClick={startCamera}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 19 8 12 15 5"></polyline>
                </svg>
              </button>
              <h1 style={{
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '500',
                margin: 0,
                letterSpacing: '-0.2px'
              }}>
                Pembayaran QRIS
              </h1>
            </div>

            {/* Main Content White Card (Fills bottom of screen) */}
            <div
              className="hide-scrollbar"
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 20px 20px 20px',
                paddingBottom: showKeyboard ? '280px' : '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                overflowY: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <form id="qris-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* 1. Pembayaran QRIS ke */}
                <div>
                  <div style={{ color: '#005ea6', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                    Pembayaran QRIS ke
                  </div>
                  <div style={{ color: '#2b3036', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.2px' }}>
                    {paymentToInput || 'FFROKKY, Fashion'}
                  </div>
                  <div style={{ color: '#555d65', fontSize: '13px', marginTop: '2px', fontWeight: '500' }}>
                    {merchantCity || 'PAYAKUMBUH, 26218, ID'}
                  </div>
                </div>

                {/* 2. Pengakuisisi */}
                <div>
                  <div style={{ color: '#005ea6', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>
                    Pengakuisisi
                  </div>
                  <div style={{ color: '#2b3036', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.2px' }}>
                    {acquirerInput || 'GOPAY'}
                  </div>
                  <div style={{ color: '#555d65', fontSize: '13px', marginTop: '2px' }}>
                    Merchant PAN {merchantPan || '9360091435851418084'}
                  </div>
                  <div style={{ color: '#555d65', fontSize: '13px', marginTop: '1px' }}>
                    No. Referensi {merchantRef || '014662486068'}
                  </div>
                </div>

                {/* 3. Sumber Dana Box */}
                <div>
                  <div style={{ color: '#005ea6', fontSize: '13px', fontWeight: '700', marginBottom: '6px', marginTop: '-16px' }}>
                    Sumber Dana
                  </div>
                  <div style={{
                    border: '1.5px solid #00a8e8',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    backgroundColor: '#ffffff'
                  }}>
                    <div style={{ color: '#003d79', fontSize: '16px', fontWeight: '600', letterSpacing: '0.3px' }}>
                      {sourceAccount || '614 - 538 - 4188'}
                    </div>
                    <div style={{ color: '#555d65', fontSize: '12px', marginTop: '4px', fontWeight: '600' }}>
                      {sourceAccountType || 'TAHAPAN XPRESI - IDR'}
                    </div>
                  </div>
                </div>

                {/* 4. Mata Uang & Nominal Input */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
                  <div>
                    <div style={{ color: '#005ea6', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                      Mata Uang
                    </div>
                    <div style={{ color: '#2b3036', fontSize: '17px', fontWeight: '700' }}>
                      IDR
                    </div>
                  </div>

                  <div style={{ width: '180px' }}>
                    <div style={{ color: '#005ea6', fontSize: '13px', fontWeight: '700' }}>
                      Nominal
                    </div>
                    <div
                      onClick={() => setShowKeyboard(true)}
                      style={{
                        position: 'relative',
                        borderBottom: '2px solid #005ea6',
                        paddingBottom: '4px',
                        cursor: 'pointer',
                        minHeight: '32px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{
                        fontSize: '18px',
                        fontWeight: '400',
                        color: amountInput ? '#1f1f20ff' : '#9aa5b1'
                      }}>
                        {amountInput}
                      </span>
                      {showKeyboard && (
                        <span style={{
                          display: 'inline-block',
                          width: '2px',
                          height: '20px',
                          backgroundColor: '#005ea6',
                          marginLeft: '2px',
                          animation: 'cursorBlink 1s infinite'
                        }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Promo Card */}
                <div>
                  <div style={{ color: '#005ea6', fontSize: '13px', fontWeight: '700', marginBottom: '6px', marginTop: '24px' }}>
                    Promo
                  </div>
                  <div style={{
                    border: '1.5px solid #d2dce6',
                    borderRadius: '14px',
                    padding: '20px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Promo Badge Icon */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L14.5 4.5L18 4L18.5 7.5L21.5 9.5L20 12.5L21.5 15.5L18.5 17.5L18 21L14.5 20.5L12 23L9.5 20.5L6 21L5.5 17.5L2.5 15.5L4 12.5L2.5 9.5L5.5 7.5L6 4L9.5 4.5L12 2Z" fill="#b0bac4" />
                        <text x="8" y="15" fill="#ffffff" fontSize="8" fontWeight="bold">%</text>
                      </svg>
                      <span style={{ color: '#9aa5b1', fontSize: '13px', fontWeight: '500' }}>
                        Gunakan Promo, jadi lebih hemat!
                      </span>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b0bac4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                </div>
              </form>

              {/* Bottom Action Button (Lanjut) when keyboard is closed */}
              {!showKeyboard && (
                <div style={{ marginTop: '28px', marginBottom: '6px' }}>
                  <button
                    type="submit"
                    form="qris-form"
                    disabled={!isReadyToContinue}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '24px',
                      border: 'none',
                      backgroundColor: isReadyToContinue ? '#0066AE' : '#cccccc',
                      color: '#ffffff',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: isReadyToContinue ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      boxShadow: isReadyToContinue ? '0 4px 12px rgba(0, 102, 174, 0.3)' : 'none'
                    }}
                  >
                    Lanjut
                  </button>
                </div>
              )}
            </div>

            {/* Virtual Numeric Keyboard (Fixed at bottom) */}
            {showKeyboard && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                backgroundColor: '#e6ebef',
                borderTop: '1px solid #d2dbe2',
                padding: '0 8px 14px 8px',
                zIndex: 40,
                boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Keyboard Toolbar with "Selesai" */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  padding: '6px 12px'
                }}>
                  <button
                    type="button"
                    onClick={() => setShowKeyboard(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#005ea6',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: '2px 4px'
                    }}
                  >
                    Selesai
                  </button>
                </div>

                {/* Keypad Grid 4 rows x 3 cols */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  padding: '0 4px'
                }}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        height: '46px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        fontWeight: '700',
                        color: '#333b42',
                        boxShadow: '0 1.5px 1px rgba(0, 0, 0, 0.12)',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      {digit}
                    </button>
                  ))}

                  {/* Backspace Key */}
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    style={{
                      backgroundColor: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      height: '46px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1.5px 1px rgba(0, 0, 0, 0.12)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#444c54">
                      {/* Backspace delete shape */}
                      <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <style jsx>{`
              @keyframes cursorBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
              }
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
                width: 0px;
                background: transparent;
              }
            `}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.mobileFrame}>
        {toast && (
          <div className={styles.toastContainer}>
            <div className={`${styles.toast} ${styles[toast.type]}`}>
              {toast.type === 'success' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              )}
              {toast.type === 'error' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        )}
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
