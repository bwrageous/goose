import React from 'react';

export default function Spacer({ className }) {
  return (
    <div className={`${className} w-[198px] h-[48px] flex-col justify-center items-start inline-flex`}>
      <div className="self-stretch h-px bg-black/5 rounded-sm" />
    </div>
  )
}
