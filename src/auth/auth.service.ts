import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async login(email: string, password: string) {
    const { data, error } = await this.supabase
      .getClient()
      .auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      this.logger.warn(`Login failed for ${email}: ${error?.message}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log(`Login success: ${email}`);
    return {
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in,
      user: {
        id:    data.user!.id,
        email: data.user!.email,
      },
    };
  }

  /** Verify a Bearer JWT and return the user, or throw 401. */
  async verifyToken(token: string) {
    const { data, error } = await this.supabase
      .getClient()
      .auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return data.user;
  }
}
