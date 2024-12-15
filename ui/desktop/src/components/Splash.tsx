import React from 'react';
import GooseSplashLogo from './GooseSplashLogo';
import SplashPills from './SplashPills';
import Spacer from './ui/spacer';

export default function Splash({ append }) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="flex flex-1" />
      <div className="flex items-center">
        <GooseSplashLogo />
        <span className="ask-goose-type ml-[8px]">ask<br />goose</span>
      </div>
      <div className="my-8">
        <Spacer />
      </div>
      <div
        className="w-[312px] px-16 py-4 text-14 text-center text-splash-pills-text whitespace-nowrap cursor-pointer bg-prev-goose-gradient text-prev-goose-text rounded-[14px] inline-block"
        onClick={async () => {
          const message = {
            content: "What can Goose do?",
            role: "user",
          };
          await append(message);
        }}
      >
        What can goose do?
      </div>
      <div className="flex flex-1" />
      <div className="flex items-center">
        <SplashPills append={append} />
      </div>
    </div>
  )
}
