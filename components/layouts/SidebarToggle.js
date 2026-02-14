/**
 * Toggle button for expand/collapse sidebar (tab handle on the right edge).
 * @param {Object} props
 * @param {boolean} props.expanded - Whether the sidebar is expanded.
 * @param {() => void} props.onToggle - Called when the button is clicked.
 */
export default function SidebarToggle({ expanded, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-3 h-9 bg-primary-100/70 border border-r-primary-200/50 border-b-primary-200/50 border-t-primary-200/50 rounded-tr-lg rounded-br-lg shadow-lg hover:shadow-xl transition-all duration-200 items-center justify-center group hover:bg-gray-50 z-50 cursor-pointer"
      aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
    >
      <div className="flex flex-col gap-0.5 -ml-0.5">
        <div className="size-[3px] rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300" />
        <div className="size-[3px] rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300" />
        <div className="size-[3px] rounded-full bg-gray-500 group-hover:bg-primary-500 transition-all duration-300" />
      </div>
    </button>
  );
}
