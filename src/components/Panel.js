import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { BiX } from 'react-icons/bi';

// A sheet that slides up from the bottom on phones and sits in the middle of
// larger screens. Closes with the × button, the Escape key or a tap outside.
function Panel({
  title, onClose, children, className,
}) {
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="panel-backdrop" role="presentation" onClick={onClose}>
      {/* Clicks inside the panel must not reach the backdrop, which closes it. */}
      {/* eslint-disable-next-line max-len */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className={`panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-head">
          <h3>{title}</h3>
          <button type="button" className="icon-button" aria-label="Close" onClick={onClose}>
            <BiX aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

Panel.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

Panel.defaultProps = { className: '' };

export default Panel;
