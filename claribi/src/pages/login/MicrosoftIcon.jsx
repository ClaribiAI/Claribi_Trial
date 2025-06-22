import React from 'react';
import { SvgIcon } from '@mui/material';

const MicrosoftIcon = (props) => {
  return (
    <SvgIcon {...props} viewBox="0 0 23 23">
      {/* Microsoft logo represented as 4 squares */}
      <path fill="#f1511b" d="M11.5 0h-11.5v11.5h11.5z" />
      <path fill="#80cc28" d="M23 0h-11.5v11.5h11.5z" />
      <path fill="#00adef" d="M11.5 11.5h-11.5v11.5h11.5z" />
      <path fill="#fbbc09" d="M23 11.5h-11.5v11.5h11.5z" />
    </SvgIcon>
  );
};

export default MicrosoftIcon; 