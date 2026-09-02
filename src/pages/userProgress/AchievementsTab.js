import React, { useMemo, useState } from 'react';
import { Table, Badge, Form, Row, Col, Button } from 'react-bootstrap';
import {
  BsXCircleFill,
  BsCheckCircleFill,
  BsHandThumbsUpFill,
  BsStarFill,
  BsQuestionCircle
} from 'react-icons/bs';

const AchievementsTab = ({ users = [] }) => {
  const achievements = [
    { key: 'bakery_done', label: 'Bakery' },
    { key: 'church_done', label: 'Church' },
    { key: 'rizal_done', label: 'Rizal' },
    { key: 'tisa_done', label: 'Tisa' },
    { key: 'tower_done', label: 'Tower' },
  ];

  const STATUS_MAP = {
    // u: Unsatisfactory (red)
    u: { label: 'Unsatisfactory', variant: 'danger', Icon: BsXCircleFill },
    // s: Satisfactory (brown)
    s: { label: 'Satisfactory', variant: 'brown', Icon: BsHandThumbsUpFill },
    // v: Very Satisfactory / Very Good (green)
    v: { label: 'Very Satisfactory', variant: 'success', Icon: BsCheckCircleFill },
    // o: Excellent / Outstanding (blue)
    o: { label: 'Excellent', variant: 'primary', Icon: BsStarFill },
    // null/unknown
    null: { label: 'Not started', variant: 'secondary', Icon: BsQuestionCircle },
  };

  const normalize = (code) => {
    if (code == null) return null;
    const c = String(code).trim().toLowerCase();
    return ['u', 's', 'v', 'o'].includes(c) ? c : null;
  };

  // Filters state
  const [query, setQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState([]); // array of 'u' | 's' | 'v' | 'o' | 'null'
  const [achievementKey, setAchievementKey] = useState(''); // filter by a specific achievement key
  const [matchMode, setMatchMode] = useState('any'); // 'any' (default) or 'all' when filtering across all achievements

  const renderBadges = (user) => (
    <div className="d-flex flex-wrap gap-2">
      {achievements.map(({ key, label }) => {
        const n = normalize(user[key]);
        const { label: statusLabel, variant, Icon } = STATUS_MAP[n] || STATUS_MAP.null;
        const isBrown = variant === 'brown';
        return (
          <Badge
            key={key}
            bg={isBrown ? undefined : variant}
            className={isBrown ? 'bg-brown' : ''}
            title={`${label}: ${statusLabel}`}
          >
            <span className="d-inline-flex align-items-center">
              <Icon className="me-1" />
              {label}: {statusLabel}
            </span>
          </Badge>
        );
      })}
    </div>
  );

  // Derived filtered users (memoized to avoid re-compute)
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((u) => {
      // Text search by username or email
      const uname = (u.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const matchesText = q.length === 0 || uname.includes(q) || email.includes(q);

      // Status filter logic
      const statusFilterActive = selectedStatuses.length > 0;

      // If filtering by a specific achievement key
      if (achievementKey) {
        const n = normalize(u[achievementKey]);
        const normalized = n ?? null;
        const matchesStatus = !statusFilterActive || selectedStatuses.includes(String(normalized));
        return matchesText && matchesStatus;
      }

      // Otherwise (All achievements selected), match based on mode
      if (statusFilterActive) {
        if (matchMode === 'all') {
          const allMatch = achievements.every(({ key }) => {
            const n = normalize(u[key]);
            const normalized = n ?? null;
            return selectedStatuses.includes(String(normalized));
          });
          return matchesText && allMatch;
        }
        // default: any
        const anyMatch = achievements.some(({ key }) => {
          const n = normalize(u[key]);
          const normalized = n ?? null;
          return selectedStatuses.includes(String(normalized));
        });
        return matchesText && anyMatch;
      }

      // No status filter, just text
      return matchesText;
    });
  }, [users, query, selectedStatuses, achievementKey, matchMode]);

  // Aggregations for reports
  const { distributionByAchievement, overallCompletion } = useMemo(() => {
    const dist = {};
    let totalCompleted = 0;
    let totalPossible = 0;

    achievements.forEach(({ key }) => {
      dist[key] = { u: 0, s: 0, v: 0, o: 0, null: 0 };
    });

    filteredUsers.forEach((u) => {
      achievements.forEach(({ key }) => {
        const n = normalize(u[key]);
        const bucket = n ?? 'null';
        if (dist[key][bucket] !== undefined) {
          dist[key][bucket] += 1;
        }
        // Completion defined as v + o
        totalPossible += 1;
        if (bucket === 'v' || bucket === 'o') totalCompleted += 1;
      });
    });

    const overallCompletion = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    return { distributionByAchievement: dist, overallCompletion };
  }, [filteredUsers, achievements]);

  // CSV helpers
  const buildCsv = (rows) => {
    const escape = (v) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    return rows.map((r) => r.map(escape).join(',')).join('\n');
  };

  const downloadCsv = (filename, rows) => {
    const csv = buildCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportUserStatuses = () => {
    const header = ['Username/Email', ...achievements.map((a) => a.label)];
    const rows = [header];
    filteredUsers.forEach((u) => {
      const idLabel = u.username || u.email || 'Unknown';
      const statusLabels = achievements.map(({ key }) => {
        const n = normalize(u[key]);
        const { label } = STATUS_MAP[n ?? null] || STATUS_MAP.null;
        return label;
      });
      rows.push([idLabel, ...statusLabels]);
    });
    downloadCsv('UserStatuses.csv', rows);
  };

  const exportAchievementDistribution = () => {
    const header = ['Achievement', 'Unsatisfactory (u)', 'Satisfactory (s)', 'Very Satisfactory (v)', 'Excellent (o)', 'Not started'];
    const rows = [header];
    achievements.forEach(({ key, label }) => {
      const d = distributionByAchievement[key];
      rows.push([label, d.u, d.s, d.v, d.o, d.null]);
    });
    downloadCsv('AchievementDistribution.csv', rows);
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-4">
        <h4>No users found</h4>
        <p className="text-muted">There are no users in the progress table.</p>
      </div>
    );
  }

  return (
    <>
      {/* Summary + Export */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <strong>Overall completion (v + o):</strong> {overallCompletion}%
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={exportUserStatuses}>
            Export User Statuses (CSV)
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={exportAchievementDistribution}>
            Export Achievement Distribution (CSV)
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Form className="mb-3">
        <Row className="g-2">
          <Col md={4}>
            <Form.Control
              type="text"
              placeholder="Search by username or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Col>
          <Col md={4}>
            <Form.Select
              value={achievementKey}
              onChange={(e) => setAchievementKey(e.target.value)}
            >
              <option value="">All achievements</option>
              {achievements.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </Form.Select>
            {achievementKey === '' && (
              <div className="mt-2">
                <Form.Check
                  type="radio"
                  id="match-mode-any"
                  label="Match any achievement"
                  name="match-mode"
                  checked={matchMode === 'any'}
                  onChange={() => setMatchMode('any')}
                />
                <Form.Check
                  type="radio"
                  id="match-mode-all"
                  label="Require all achievements to match"
                  name="match-mode"
                  checked={matchMode === 'all'}
                  onChange={() => setMatchMode('all')}
                />
              </div>
            )}
          </Col>
          <Col md={4}>
            <Form.Select
              multiple
              value={selectedStatuses}
              onChange={(e) =>
                setSelectedStatuses(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
            >
              <option value="u">Unsatisfactory</option>
              <option value="s">Satisfactory</option>
              <option value="v">Very Satisfactory</option>
              <option value="o">Excellent</option>
              <option value="null">Not started</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Hold Ctrl (Cmd on Mac) to select multiple statuses.
            </Form.Text>
          </Col>
        </Row>
      </Form>

      <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Username</th>
          <th>Achievements</th>
        </tr>
      </thead>
      <tbody>
        {filteredUsers.map((user, index) => (
          <tr key={user.id ?? `${user.username || 'unknown'}-${user.email || 'unknown'}-${index}`}>
            <td>{user.username || user.email || 'Unknown'}</td>
            <td>{renderBadges(user)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
    </>
  );
};

export default AchievementsTab;
