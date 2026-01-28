import React, { useState } from 'react';
import { useAuth, loginWithGoogle } from '../contexts/AuthContext';

const LoginPage = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { user } = useAuth();

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('登入失敗:', error);
      alert(`登入失敗：${error.message}`);
      setIsLoggingIn(false);
    }
  };

  if (user) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🍱</div>
        
        <h1 style={styles.title}>公司午餐訂購系統</h1>
        <p style={styles.subtitle}>請使用 Google 帳號登入</p>
        
        <button 
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          style={{
            ...styles.button,
            opacity: isLoggingIn ? 0.6 : 1,
            cursor: isLoggingIn ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoggingIn ? '正在導向...' : '使用 Google 帳號登入'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%'
  },
  logo: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#333'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '30px'
  },
  button: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#4285F4',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.3s',
  }
};

export default LoginPage;