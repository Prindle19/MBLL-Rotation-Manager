import { ShieldAlert, BookOpen, Clock, Activity, AlertCircle, Users } from 'lucide-react';

export default function RulesEngine() {
  return (
    <div className="app-container">
      <div style={{marginBottom: '40px'}}>
        <h1 className="brand" style={{fontSize: '32px', marginBottom: '16px'}}>
          <BookOpen style={{marginRight: '12px'}} size={32} />
          Rules Engine Logic & Constraints
        </h1>
        <p style={{color: 'var(--text-secondary)', fontSize: '18px', maxWidth: '800px', lineHeight: '1.6'}}>
          Transparency into how the MBLL Rotation Manager automatically assigns positions, validates locks, 
          and handles pitch count logic to ensure fair play and compliance with league rules.
        </p>
      </div>

      <div className="grid-layout" style={{gap: '32px'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
          
          <div className="glass-panel">
            <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)'}}>
              <ShieldAlert size={24} /> Mandatory League Rules
            </h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>
              The engine mathematically guarantees these minimum requirements are met for every active player.
            </p>
            
            <div style={{background: 'rgba(15,23,42,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px'}}>
              <h3 style={{marginTop: 0, color: 'white'}}>Minors League</h3>
              <ul style={{color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: '1.6'}}>
                <li><strong>Infield Minimum:</strong> Every player must play at least 2 innings in the infield (P, C, 1B, 2B, 3B, SS).</li>
                <li><strong>Outfield Minimum:</strong> Every player must play at least 1 inning in the outfield.</li>
                <li><strong>Outfield Size:</strong> If 10 or more players are active, the outfield consists of 4 positions (LF, LC, RC, RF). If under 10, it uses 3 positions (LF, CF, RF).</li>
              </ul>
            </div>

            <div style={{background: 'rgba(15,23,42,0.6)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)'}}>
              <h3 style={{marginTop: 0, color: 'white'}}>Majors League</h3>
              <ul style={{color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: '1.6'}}>
                <li><strong>Outfield Minimum:</strong> Every player must play at least 1 inning in the outfield.</li>
                <li><strong>Infield Minimum:</strong> No strict minimums enforced by the algorithm.</li>
                <li><strong>Outfield Size:</strong> Always uses 3 outfield positions (LF, CF, RF).</li>
              </ul>
            </div>
          </div>

          <div className="glass-panel">
            <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981'}}>
              <Activity size={24} /> Skill Ratings & Assignments
            </h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>
              Ratings do <strong>not</strong> force players into the Infield vs Outfield. Instead, when a player does not urgently need to fulfill a mandatory minimum, the algorithm randomly selects an available zone (Infield or Outfield) and then uses their star rating to determine the <em>difficulty</em> of the position they are assigned to within that zone.
            </p>
            
            <h3 style={{color: 'white', marginTop: '24px', fontSize: '16px'}}>Infield Skill Logic</h3>
            <ul style={{color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: '1.6'}}>
              <li><strong>4 or 5 Stars:</strong> Prioritized for premium infield spots (Shortstop, 1st Base, 3rd Base).</li>
              <li><strong>1 or 2 Stars:</strong> Prioritized for less demanding spots (assigned to 2nd Base).</li>
              <li><strong>3 Stars:</strong> Randomly distributed to any available infield position.</li>
            </ul>

            <h3 style={{color: 'white', marginTop: '16px', fontSize: '16px'}}>Outfield Skill Logic</h3>
            <ul style={{color: 'var(--text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: '1.6'}}>
              <li><strong>4 or 5 Stars:</strong> Prioritized for premium outfield coverage (Center Field, Left Center, Left Field).</li>
              <li><strong>1 or 2 Stars:</strong> Prioritized for less demanding spots (assigned to Right Field or Right Center).</li>
              <li><strong>3 Stars:</strong> Randomly distributed to any available outfield position.</li>
            </ul>
          </div>

        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>

          <div className="glass-panel">
            <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b'}}>
              <AlertCircle size={24} /> Absolute Priority Mode
            </h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>
              The engine assigns an "Urgency Score" to every player each inning. 
            </p>
            <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>
              If a player has exactly enough open innings left in the game to meet their mandatory requirements (e.g., they need 2 IF innings and only have 2 innings left to play), they enter <strong>Absolute Priority Mode</strong>. 
            </p>
            <p style={{color: 'var(--text-secondary)', margin: 0}}>
              Players in this mode bypass all skill ratings and are immediately assigned to the position types they need, ensuring no player ever falls short of league minimums. 
              Additionally, players who were benched in the previous inning receive a massive urgency boost to ensure nobody sits twice in a row.
            </p>
          </div>

          <div className="glass-panel">
            <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444'}}>
              <Clock size={24} /> Pitch Count & Rest Rules
            </h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '16px'}}>
              Pitch counts are strictly enforced based on Little League official rules. The engine prevents players from pitching if they lack required rest.
            </p>
            
            <h3 style={{fontSize: '16px', color: 'white', marginTop: '24px'}}>Daily Max Pitches by League Age</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px'}}>
              <div style={{background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}><strong>Ages 6-8:</strong> 50 pitches</div>
              <div style={{background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}><strong>Ages 9-10:</strong> 75 pitches</div>
              <div style={{background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}><strong>Ages 11-12:</strong> 85 pitches</div>
              <div style={{background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}><strong>Ages 13-16:</strong> 95 pitches</div>
            </div>

            <h3 style={{fontSize: '16px', color: 'white'}}>Required Rest Days (Ages 14 and Under)</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '12px'}}>
              <thead>
                <tr>
                  <th style={{padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}>Pitches Thrown</th>
                  <th style={{padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)'}}>Required Rest</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{padding: '12px', borderBottom: '1px solid var(--border-color)', color: 'white'}}>1 - 20 Pitches</td>
                  <td style={{padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'white'}}>0 Days</td>
                </tr>
                <tr>
                  <td style={{padding: '12px', borderBottom: '1px solid var(--border-color)', color: 'white'}}>21 - 35 Pitches</td>
                  <td style={{padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'white'}}>1 Day</td>
                </tr>
                <tr>
                  <td style={{padding: '12px', borderBottom: '1px solid var(--border-color)', color: 'white'}}>36 - 50 Pitches</td>
                  <td style={{padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'white'}}>2 Days</td>
                </tr>
                <tr>
                  <td style={{padding: '12px', borderBottom: '1px solid var(--border-color)', color: 'white'}}>51 - 65 Pitches</td>
                  <td style={{padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'white'}}>3 Days</td>
                </tr>
                <tr>
                  <td style={{padding: '12px', borderBottom: '1px solid var(--border-color)', color: 'white'}}>66+ Pitches</td>
                  <td style={{padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--border-color)', color: 'white'}}>4 Days</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="glass-panel">
            <h2 style={{display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6'}}>
              <Users size={24} /> Substitute Logic
            </h2>
            <p style={{color: 'var(--text-secondary)', margin: 0}}>
              Temporary substitutes are exempt from mandatory league minimums. To protect the integrity of the team's core roster, the algorithm highly prioritizes placing substitutes in the Outfield (specifically Right Field when possible).
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
