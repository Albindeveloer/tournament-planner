import { pool } from '../../infrastructure/database/postgres.js';

export type TeamMember = {
  id: string;
  team_id: string;
  participant_id: string;
  member_role: string;
  squad_status: string;
  created_at: Date;
  updated_at: Date;
};

export type CreateTeamMemberParams = {
  teamId: string;
  participantId: string;
  memberRole: string;
  squadStatus: string;
};

export type UpdateTeamMemberParams = {
  memberRole?: string | undefined;
  squadStatus?: string | undefined;
};

export class TeamMemberRepository {
  async create(params: CreateTeamMemberParams): Promise<TeamMember> {
    const result = await pool.query<TeamMember>(
      `INSERT INTO team_members (team_id, participant_id, member_role, squad_status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [params.teamId, params.participantId, params.memberRole, params.squadStatus],
    );
    return result.rows[0] as TeamMember;
  }

  async findByTeamId(teamId: string): Promise<TeamMember[]> {
    const result = await pool.query<TeamMember>(
      `SELECT * FROM team_members WHERE team_id = $1 ORDER BY created_at ASC`,
      [teamId],
    );
    return result.rows;
  }

  async findById(id: string): Promise<TeamMember | null> {
    const result = await pool.query<TeamMember>(
      `SELECT * FROM team_members WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async countByTeamId(teamId: string): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM team_members WHERE team_id = $1`,
      [teamId],
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
  }

  async update(id: string, params: UpdateTeamMemberParams): Promise<TeamMember | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (params.memberRole !== undefined) {
      fields.push(`member_role = $${idx++}`);
      values.push(params.memberRole);
    }
    if (params.squadStatus !== undefined) {
      fields.push(`squad_status = $${idx++}`);
      values.push(params.squadStatus);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query<TeamMember>(
      `UPDATE team_members SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return result.rows[0] ?? null;
  }

  async remove(id: string): Promise<void> {
    await pool.query(`DELETE FROM team_members WHERE id = $1`, [id]);
  }
}

export const teamMemberRepository = new TeamMemberRepository();
