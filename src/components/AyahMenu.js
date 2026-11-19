import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  BiBookContent, BiBookmark, BiCopy, BiNote, BiPlay, BiShareAlt, BiTrash,
} from 'react-icons/bi';
import { BsBookmarkFill } from 'react-icons/bs';
import Panel from './Panel';

// Everything that can be done with one ayah, opened by tapping its number.
function AyahMenu({
  title, text, translation, bookmarked, note, onPlay, onTafsir, onBookmark, onSaveNote,
  onCopy, onShare, onClose,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);

  return (
    <Panel title={title} onClose={onClose} className="ayah-menu">
      <div className="panel-body">
        <p className="menu-ayah" lang="ar" dir="rtl">{text}</p>
        {translation && <p className="menu-translation">{translation}</p>}

        {!editing && (
          <div className="menu-grid">
            <button type="button" onClick={onPlay}>
              <BiPlay aria-hidden="true" />
              <span>Play from here</span>
            </button>
            <button type="button" onClick={onTafsir}>
              <BiBookContent aria-hidden="true" />
              <span>Tafsir</span>
            </button>
            <button type="button" className={bookmarked ? 'on' : ''} onClick={onBookmark} aria-pressed={bookmarked}>
              {bookmarked ? <BsBookmarkFill aria-hidden="true" /> : <BiBookmark aria-hidden="true" />}
              <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            <button type="button" className={note ? 'on' : ''} onClick={() => { setDraft(note); setEditing(true); }}>
              <BiNote aria-hidden="true" />
              <span>{note ? 'Edit note' : 'Add note'}</span>
            </button>
            <button type="button" onClick={onCopy}>
              <BiCopy aria-hidden="true" />
              <span>Copy</span>
            </button>
            <button type="button" onClick={onShare}>
              <BiShareAlt aria-hidden="true" />
              <span>Share</span>
            </button>
          </div>
        )}

        {!editing && note && (
          <div className="menu-note">
            <BiNote aria-hidden="true" />
            <p>{note}</p>
          </div>
        )}

        {editing && (
          <form
            className="note-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSaveNote(draft.trim());
              setEditing(false);
            }}
          >
            <label htmlFor="note-text">
              <span className="visually-hidden">Note</span>
              <textarea
                id="note-text"
                rows={5}
                maxLength={4000}
                placeholder="Write your note on this ayah…"
                value={draft}
              // A note is opened to be written in.
              // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                onChange={(event) => setDraft(event.target.value)}
              />
            </label>
            <div className="note-actions">
              {note && (
                <button
                  type="button"
                  className="plain-button danger"
                  onClick={() => { onSaveNote(''); setEditing(false); }}
                >
                  <BiTrash aria-hidden="true" />
                  {' '}
                  Delete
                </button>
              )}
              <span className="spacer" />
              <button type="button" className="plain-button secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="plain-button" disabled={!draft.trim() && !note}>
                Save
              </button>
            </div>
          </form>
        )}
      </div>
    </Panel>
  );
}

AyahMenu.propTypes = {
  title: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  translation: PropTypes.string,
  bookmarked: PropTypes.bool.isRequired,
  note: PropTypes.string,
  onPlay: PropTypes.func.isRequired,
  onTafsir: PropTypes.func.isRequired,
  onBookmark: PropTypes.func.isRequired,
  onSaveNote: PropTypes.func.isRequired,
  onCopy: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

AyahMenu.defaultProps = { translation: '', note: '' };

export default AyahMenu;
