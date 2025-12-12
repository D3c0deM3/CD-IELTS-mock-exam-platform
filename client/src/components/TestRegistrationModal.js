import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import "./TestRegistrationModal.css";

const TestRegistrationModal = ({
  isOpen,
  onClose,
  testName,
  adminEmail,
  adminPhone,
}) => {
  const [language, setLanguage] = useState("en"); // 'en' or 'uz'

  const content = {
    en: {
      title: "Test Registration Required",
      message: `In order to register for <strong>${testName}</strong> mock test, you should contact with the admin.`,
      adminInfo: "Admin Contact Information",
      email: "Telegram",
      phone: "Phone",
      close: "Close",
    },
    uz: {
      title: "Testga ro'yxatdan o'tish talab qilinadi",
      message: `<strong>${testName}</strong> mock test uchun ro'yxatdan o'tish uchun administrator bilan bog'lanish kerak.`,
      adminInfo: "Administrator kontakt ma'lumotlari",
      email: "Telegram",
      phone: "Telefon",
      close: "Yopish",
    },
  };

  const t = content[language];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>{t.title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <FiX size={24} />
          </button>
        </div>

        {/* Language Toggle */}
        <div className="language-toggle">
          <button
            className={`lang-btn ${language === "en" ? "active" : ""}`}
            onClick={() => setLanguage("en")}
          >
            English
          </button>
          <button
            className={`lang-btn ${language === "uz" ? "active" : ""}`}
            onClick={() => setLanguage("uz")}
          >
            O'zbekcha
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p dangerouslySetInnerHTML={{ __html: t.message }} />

          <div className="admin-info-section">
            <h3>{t.adminInfo}</h3>
            <div className="info-card">
              {adminEmail && (
                <div className="info-row">
                  <span className="info-label">{t.email}:</span>
                  <a href={`mailto:${adminEmail}`} className="info-value">
                    {adminEmail}
                  </a>
                </div>
              )}
              {adminPhone && (
                <div className="info-row">
                  <span className="info-label">{t.phone}:</span>
                  <a href={`tel:${adminPhone}`} className="info-value">
                    {adminPhone}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestRegistrationModal;
