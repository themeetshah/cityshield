import { Link } from 'react-router-dom';
import { Bell, CheckCheck, CheckCircle } from 'lucide-react';
import { formatDateTime, timeAgo } from '../community/format';
import { SectionError } from '../community/StateViews';
import { Button, Card, SectionHeading } from './ui';

const isInternalLink = (link) => typeof link === 'string' && link.startsWith('/') && !link.startsWith('//');

const NotificationsPanel = ({ notifications, unreadCount, error, busy, onRetry, onMarkRead, onMarkAllRead }) => (
    <Card className="p-4 sm:p-6 lg:p-8">
        <SectionHeading
            icon={Bell}
            gradient="from-yellow-500 to-orange-600"
            title="Notifications"
            description={unreadCount ? `${unreadCount} unread` : 'You are all caught up.'}
        >
            {unreadCount > 0 && (
                <Button size="sm" variant="secondary" onClick={onMarkAllRead} disabled={busy}>
                    <CheckCheck className="w-4 h-4" aria-hidden="true" />
                    Mark all as read
                </Button>
            )}
        </SectionHeading>

        {error ? (
            <SectionError message={error} onRetry={onRetry} />
        ) : notifications.length === 0 ? (
            <div className="text-center py-12">
                <p className="text-lg font-bold text-gray-900 mb-2">No notifications</p>
                <p className="text-gray-600">Updates about your reports and volunteer application will appear here.</p>
            </div>
        ) : (
            <ul className="space-y-3">
                {notifications.map((n) => (
                    <li
                        key={n.id}
                        className={`p-4 rounded-2xl border-2 ${
                            n.is_read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                        }`}
                    >
                        <div className="flex items-start gap-3">
                            <span
                                className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-blue-500'}`}
                                aria-hidden="true"
                            />
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold break-words ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                    {!n.is_read && <span className="sr-only">Unread: </span>}
                                    {n.title}
                                </p>
                                {n.message && <p className="text-sm text-gray-700 mt-1 break-words whitespace-pre-line">{n.message}</p>}
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                                    <time dateTime={n.created_at} title={formatDateTime(n.created_at)} className="text-gray-500">
                                        {timeAgo(n.created_at)}
                                    </time>
                                    {isInternalLink(n.link) && (
                                        <Link
                                            to={n.link}
                                            onClick={() => !n.is_read && onMarkRead(n.id)}
                                            className="font-semibold text-blue-700 hover:underline"
                                        >
                                            Open
                                        </Link>
                                    )}
                                    {!n.is_read && (
                                        <button
                                            type="button"
                                            onClick={() => onMarkRead(n.id)}
                                            disabled={busy}
                                            className="inline-flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-50"
                                        >
                                            <CheckCircle className="w-4 h-4" aria-hidden="true" />
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        )}
    </Card>
);

export default NotificationsPanel;
