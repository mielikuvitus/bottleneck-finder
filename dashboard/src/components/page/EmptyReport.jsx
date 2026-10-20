// No run selected yet (Figma: No run selected layout)
import AppHeader from './AppHeader.jsx';
import ProjectContext from './ProjectContext.jsx';

// picker: the RunPicker, shown in place of the plain selector box
export default function EmptyReport({ picker }) {
  return (
    <div className="app-frame">
      <AppHeader />
      <ProjectContext label="Select a run">{picker}</ProjectContext>
      <div className="empty-report">
        <div className="empty-report-symbol" aria-hidden="true">
          ↳
        </div>
        <h2 className="empty-report-title">Choose a run to see the story.</h2>
        <p className="empty-report-text">
          Select a main or sign-up campaign test to see capacity, visitor impact and the evidence behind each finding.
        </p>
      </div>
    </div>
  );
}
