// finding.fallback_point: { timeout_seconds, predicted: { starts_above, expected,
// campaign }, measured: { summary, note, sustained_timeouts_from_second,
// seconds_after_load_went_over_capacity, predicted_for_that_load, ... } }
export default function PredictionVsMeasured({ fallbackPoint }) {
  if (!fallbackPoint) return null;
  const { predicted, measured } = fallbackPoint;
  return (
    <div className="prediction-vs-measured">
      <dl>
        <dt>Timeout</dt>
        <dd>{fallbackPoint.timeout_seconds ?? 'none'}s</dd>
        <dt>Starts above</dt>
        <dd>{predicted.starts_above}</dd>
        <dt>Predicted, expected peak</dt>
        <dd>{predicted.expected.summary}</dd>
        <dt>Predicted, campaign peak</dt>
        <dd>{predicted.campaign.summary}</dd>
        {measured.predicted_for_that_load ? (
          <>
            <dt>Predicted, for the measured load</dt>
            <dd>{measured.predicted_for_that_load.summary}</dd>
          </>
        ) : null}
        <dt>Measured</dt>
        <dd>{measured.summary}</dd>
      </dl>
    </div>
  );
}
