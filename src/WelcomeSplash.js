import React, { useState } from 'react';
import './WelcomeSplash.css';

const WelcomeSplash = ({ onEnter }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(onEnter, 500);
  };

  return (
    <div className="welcome-splash" onClick={handleClick}>
      {/* 背景装饰 */}
      <div className="ink-background">
        {/* 柔和曲线装饰 */}
        <svg className="curve-decoration" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          {/* 顶部柔和曲线 */}
          <path
            className="curve curve-top"
            d="M 0 150 Q 300 80 600 150 T 1200 150"
            fill="none"
            stroke="#d4b5a0"
            strokeWidth="1.5"
            opacity="0.3"
          />
          <path
            className="curve curve-top-inner"
            d="M 50 200 Q 300 120 600 200 T 1150 200"
            fill="none"
            stroke="#c9a961"
            strokeWidth="1"
            opacity="0.2"
          />

          {/* 中部柔和波浪 */}
          <path
            className="curve curve-mid-1"
            d="M 0 400 Q 300 300 600 400 T 1200 400"
            fill="none"
            stroke="#a89080"
            strokeWidth="1.5"
            opacity="0.25"
          />
          <path
            className="curve curve-mid-2"
            d="M 0 450 Q 200 350 400 450 T 800 450 T 1200 450"
            fill="none"
            stroke="#b5a597"
            strokeWidth="1"
            opacity="0.2"
          />

          {/* 底部柔和曲线 */}
          <path
            className="curve curve-bottom"
            d="M 0 650 Q 300 600 600 650 T 1200 650"
            fill="none"
            stroke="#8ba8d4"
            strokeWidth="2"
            opacity="0.3"
          />
          <path
            className="curve curve-bottom-inner"
            d="M 0 700 Q 200 650 400 700 T 800 700 T 1200 700"
            fill="none"
            stroke="#7a9ac9"
            strokeWidth="1.5"
            opacity="0.2"
          />

          {/* 左侧装饰曲线 */}
          <path
            className="curve curve-side-left"
            d="M 50 200 Q 80 400 50 600"
            fill="none"
            stroke="#d4b5a0"
            strokeWidth="1"
            opacity="0.2"
          />

          {/* 右侧装饰曲线 */}
          <path
            className="curve curve-side-right"
            d="M 1150 200 Q 1120 400 1150 600"
            fill="none"
            stroke="#d4b5a0"
            strokeWidth="1"
            opacity="0.2"
          />
        </svg>

        {/* 柔和填充形状 */}
        <div className="soft-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>

        {/* 雾气效果 */}
        <div className={`mist ${isAnimating ? 'dissolve' : ''}`}>
          <div className="mist-layer mist-1"></div>
          <div className="mist-layer mist-2"></div>
          <div className="mist-layer mist-3"></div>
        </div>
      </div>

      {/* 文字 */}
      <div className="welcome-content">
        <h1 className={`welcome-title ${isAnimating ? 'title-move-up' : ''}`}>FEEL DE LUXE</h1>
        <p className="welcome-subtitle">点击进入</p>
      </div>
    </div>
  );
};

export default WelcomeSplash;
