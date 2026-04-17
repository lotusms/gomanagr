import PlaceholderPanel from './PlaceholderPanel';

export default function ClientJobTimeSection({ clientTerm, projectTerm }) {
  return (
    <PlaceholderPanel title={`${clientTerm} & ${projectTerm} time`}>
      Roll up hours by {clientTerm.toLowerCase()}, {projectTerm.toLowerCase()}, case, job, or property— billable vs
      non-billable, uninvoiced time, and labor cost in one place. Labels follow your industry settings.
    </PlaceholderPanel>
  );
}
