import { css } from '@linaria/core';

// table
export const sTable = css`
  display: grid;
  grid-template-columns: auto auto auto auto auto;
`;

export const sRowSelected = css`
  background-color: #161616;
`;

export const sRow = css`
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
`;

export const sRowIdle = css`
  color: #999;
`;

export const sRowSelectable = css`
  /* &:hover:not(.${sRowSelected}) {
    background-color: #333;
  } */
`;

export const sCell = css`
  flex: 1;
  border: 1px solid #ccc;
  padding: 10px 15px;

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: default;
  outline: none;
`;

export const sCellHeader = css`
  cursor: pointer;
`;

// toolbar
export const sToolbar = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
`;

export const sToolbarLeft = css`
  display: flex;
  gap: 10px;
  align-items: center;
`;

export const sToolbarRight = css`
  display: flex;
  gap: 10px;
  align-items: center;
`;
