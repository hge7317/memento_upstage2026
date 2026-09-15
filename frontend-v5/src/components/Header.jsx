import React from "react";

export default function Header({ dark }) {
  return (
    <header className={`header${dark ? " header--dark" : ""}`}>
      <div className="header__dots" role="presentation">
        <span className="header__dot header__dot--orange" />
        <span className="header__dot-line" />
        <span className="header__dot header__dot--teal" />
      </div>
      <div className="header__logo">MEMENTO</div>
      <span className="save-chip">저장 완료</span>
    </header>
  );
}
