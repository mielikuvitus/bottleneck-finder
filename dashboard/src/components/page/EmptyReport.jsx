// No run selected yet
import AppHeader from './AppHeader.jsx';
import Icon from '../atoms/Icon.jsx';
import ProjectContext from './ProjectContext.jsx';

// picker: the RunPicker, shown in place of the plain selector box
export default function EmptyReport({ picker }) {
  return (
    <div className="app-frame">
      <AppHeader />
      <ProjectContext label="Select a run">{picker}</ProjectContext>
      <div className="empty-report">
        {/* Points up at the run selector; hovering this card pulses it (CSS) */}
        <div className="empty-report-symbol" aria-hidden="true">
          <Icon name="arrowUpward" size={28} />
        </div>
        <h2 className="empty-report-title">Choose a run to see the story.</h2>
        <p className="empty-report-text">
          Select a main or sign-up campaign test to see capacity, visitor impact and the evidence behind each finding.
        </p>
      </div>
    </div>
  );
}
