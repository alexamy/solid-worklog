import { css } from '@linaria/core';

// table
export const sRow = css`
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
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
  line-height: 1.5;
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
