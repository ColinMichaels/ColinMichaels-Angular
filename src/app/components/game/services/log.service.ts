// Compatibility bridge for legacy Core OS imports. The implementation is
// shared because public authentication also needs local, non-persistent logs.
export {LogService} from '../../../shared/logging/log.service';
export type {LogEntry, LogLevel} from '../../../shared/logging/log.service';
