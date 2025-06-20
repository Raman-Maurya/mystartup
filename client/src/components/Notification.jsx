import React, { useState, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

const Notification = ({ 
  show = false, 
  message = '', 
  type = 'info', 
  onClose = () => {}, 
  position = 'top-end',
  autohide = true,
  delay = 5000
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  const handleClose = () => {
    setVisible(false);
    onClose();
  };

  const getToastVariant = () => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return 'bi-check-circle-fill';
      case 'error': return 'bi-exclamation-triangle-fill';
      case 'warning': return 'bi-exclamation-circle-fill';
      default: return 'bi-info-circle-fill';
    }
  };

  return (
    <ToastContainer position={position} className="p-3" style={{ zIndex: 1500 }}>
      <Toast 
        show={visible} 
        onClose={handleClose} 
        delay={delay} 
        autohide={autohide}
        bg={getToastVariant()}
        className="text-white"
      >
        <Toast.Header closeButton>
          <i className={`bi ${getIcon()} me-2`}></i>
          <strong className="me-auto">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </strong>
          <small>just now</small>
        </Toast.Header>
        <Toast.Body>{message}</Toast.Body>
      </Toast>
    </ToastContainer>
  );
};

export default Notification;
