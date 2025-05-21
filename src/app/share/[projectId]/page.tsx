// pages/password.js
"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation'; // 导入useParams钩子
import styles from './page.module.css'; // 导入CSS模块

export default function PasswordPage() {
  const params = useParams<{ projectId: string }>(); // 获取路由参数
  const projectId = params.projectId || "to-markdown"; // 使用路由参数，如果不存在则使用默认值
  const fulldomain = "/html"; // 您的域名

  const [passwordDigits, setPasswordDigits] = useState(['', '', '', '']);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const digitRefs = useRef<any[]>([]);

  // 检查所有数字是否已输入
  const checkAllDigits = () => {
    return passwordDigits.every(digit => digit !== '');
  };

  // 处理单个数字输入
  const handleDigitChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    // 确保只输入数字
    if (!/^\d*$/.test(value)) {
      return;
    }

    const newDigits = [...passwordDigits];
    newDigits[index] = value.slice(-1); // 只取最后一个字符，防止粘贴多位

    setPasswordDigits(newDigits);

    // 自动聚焦到下一个输入框
    if (value && index < digitRefs.current.length - 1) {
      digitRefs.current[index + 1].focus();
    }
  };

  // 处理删除键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !passwordDigits[index] && index > 0) {
      digitRefs.current[index - 1].focus();
    }
  };

  // 提交密码
  const handleSubmit = async () => {
    const password = passwordDigits.join('');
    setErrorMessage(''); // 清除之前的错误信息

    if (!checkAllDigits()) {
      setErrorMessage('请输入完整的四位密码');
      return;
    }

    try {
      const response = await fetch(`/api/verify-password/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        // 密码正确，保存到本地存储并解锁
        try {
          localStorage.setItem(`project_password_${projectId}`, password);
        } catch (e) {
          console.error("无法保存密码到本地存储", e);
        }
        setIsUnlocked(true);
      } else {
        // 密码错误
        setErrorMessage('密码错误，请重试');
        setPasswordDigits(['', '', '', '']); // 清空输入框
        digitRefs.current[0].focus(); // 聚焦到第一个输入框
      }
    } catch (error) {
      console.error("验证密码时出错:", error);
      setErrorMessage('验证过程中发生错误，请稍后重试');
    }
  };

  // 页面加载时检查本地存储中的密码
  useEffect(() => {
    const savedPassword = localStorage.getItem(`project_password_${projectId}`);
    if (savedPassword) {
      // 尝试自动验证已保存的密码
      const verifySavedPassword = async () => {
        try {
          const response = await fetch(`/api/verify-password/${projectId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: savedPassword }),
          });
          const data = await response.json();
          if (data.success) {
            setIsUnlocked(true);
          } else {
            // 如果保存的密码无效，清除它
            localStorage.removeItem(`project_password_${projectId}`);
          }
        } catch (error) {
          console.error("验证已保存密码时出错:", error);
        }
      };
      verifySavedPassword();
    }
  }, [projectId]); // 添加projectId作为依赖项

  // 自动聚焦到第一个输入框
  useEffect(() => {
    if (!isUnlocked && digitRefs.current[0]) {
      digitRefs.current[0].focus();
    }
  }, [isUnlocked]);

  if (isUnlocked) {
    return (
      <div className={styles.fullScreenFrame}>
        <iframe
          id="projectFrame"
          src={`${fulldomain}/${projectId}.html`}
          allow="microphone; camera"
          frameBorder="0"
          width="100%"
          height="100%"
        ></iframe>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.passwordContainer}>
        <h1 className={styles.projectTitle}>已锁定项目</h1>
        <p className={styles.passwordHint}>需要密码才能查看此创作</p>

        <div className={styles.passwordInputSection}>
          <div className={styles.digitGroup}>
            {passwordDigits.map((digit, index) => (
              <input
                key={index}
                type="text"
                id={`digit-${index + 1}`}
                className={styles.digitInput}
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                ref={(el: any) => digitRefs.current[index] = el} // 存储ref
              />
            ))}
          </div>

          <button
            id="passwordButton"
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!checkAllDigits()}
          >
            解锁
          </button>

          {errorMessage && (
            <p id="errorMessage" className={`${styles.errorMessage} ${styles.show}`}>
              {errorMessage}
            </p>
          )}
          <p className={styles.helpText}>提示：密码为四位数字，请向项目创建者索取</p>
        </div>
      </div>
    </div>
  );
}