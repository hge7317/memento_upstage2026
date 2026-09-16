import React from "react";

export default function Header({ dark, onBack, onLogoClick }) {
  return (
    <header className={`header${dark ? " header--dark" : ""}`}>
      <div className="header__logo" onClick={onLogoClick || undefined}>MEMENTO</div>
    </header>
  );
}
