# Circuit breaker

Circuit-breaker policy rows exist in the database schema, but the runtime state machine is not implemented yet. Production readiness requires per-upstream CLOSED/OPEN/HALF_OPEN state, bounded probes, failure classification, recovery timeout, replica coordination choice, metrics, and transition tests.
