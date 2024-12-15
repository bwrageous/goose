import React from "react"

function SplashPill({ content, append }) {
  return (
    <div
      className="px-4 py-3 text-14 text-center text-splash-pills-text cursor-pointer bg-black/5 rounded-full inline-block w-fit whitespace-nowrap"
      onClick={async () => {
        const message = {
          content,
          role: "user",
        };
        await append(message);
      }}
    >
      {content}
    </div>
  )
}

export default function SplashPills({ append }) {
  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 justify-center">
        <SplashPill content="Migrate code to React" append={append} />
        <SplashPill content="Scaffold this API for data retention" append={append} />
        <SplashPill content="Summarize my recent file changes" append={append} />
        <SplashPill content="Find all .pdf files" append={append} />
      </div>
    </div>
  )
}
