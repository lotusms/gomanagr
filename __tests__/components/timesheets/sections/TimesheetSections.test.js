import { render, screen } from '@testing-library/react';
import ApprovalQueueSection from '@/components/timesheets/sections/ApprovalQueueSection';
import ClientJobTimeSection from '@/components/timesheets/sections/ClientJobTimeSection';
import MemberTimeOffPanel from '@/components/timesheets/sections/MemberTimeOffPanel';
import PlaceholderPanel from '@/components/timesheets/sections/PlaceholderPanel';
import ReportsSection from '@/components/timesheets/sections/ReportsSection';
import SettingsSection from '@/components/timesheets/sections/SettingsSection';
import TeamOverviewSection from '@/components/timesheets/sections/TeamOverviewSection';

jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

describe('timesheets section components', () => {
  it('renders approval queue roadmap copy', () => {
    render(<ApprovalQueueSection />);
    expect(screen.getByRole('heading', { name: /approval queue/i })).toBeInTheDocument();
    expect(screen.getByText(/bulk approve/i)).toBeInTheDocument();
  });

  it('renders client and project terms in client/job section', () => {
    render(<ClientJobTimeSection clientTerm="Client" projectTerm="Project" />);
    expect(screen.getByRole('heading', { name: /client & project time/i })).toBeInTheDocument();
    expect(screen.getByText(/roll up hours by client/i)).toBeInTheDocument();
  });

  it('renders disabled time-off request button', () => {
    render(<MemberTimeOffPanel />);
    const button = screen.getByRole('button', { name: /new time-off request/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Coming soon');
  });

  it('renders placeholder panel title and copy', () => {
    render(<PlaceholderPanel title="Panel title">Placeholder copy</PlaceholderPanel>);
    expect(screen.getByRole('heading', { name: /panel title/i })).toBeInTheDocument();
    expect(screen.getByText('Placeholder copy')).toBeInTheDocument();
  });

  it('renders report cards', () => {
    render(<ReportsSection />);
    expect(screen.getByText(/hours by person/i)).toBeInTheDocument();
    expect(screen.getByText(/utilization & overtime/i)).toBeInTheDocument();
    expect(screen.getAllByText(/report builder — coming soon/i).length).toBeGreaterThan(1);
  });

  it('renders settings preview bullets', () => {
    render(<SettingsSection />);
    expect(screen.getByRole('heading', { name: /organization defaults/i })).toBeInTheDocument();
    expect(screen.getByText(/separate toggles for billable/i)).toBeInTheDocument();
    expect(screen.getByText(/default tracking mode/i)).toBeInTheDocument();
  });

  it('renders team overview with injected terms', () => {
    render(<TeamOverviewSection teamTerm="Team" projectTerm="Project" clientTerm="Client" />);
    expect(screen.getByRole('heading', { name: /team overview/i })).toBeInTheDocument();
    expect(screen.getByText(/filtered by location/i)).toBeInTheDocument();
  });
});
