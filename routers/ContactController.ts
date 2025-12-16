import { GET, POST, route } from 'awilix-koa';
import type { Context } from 'koa';
import type ContactService from '../services/ContactService';

@route('/api/contacts')
class ContactController {
  private contactService: ContactService;

  constructor({ contactService }: { contactService: ContactService }) {
    this.contactService = contactService;
  }

  @POST()
  async create(ctx: Context) {
    try {
      const { name, email } = ctx.request.body as { name?: string; email?: string };

      // 验证必填字段
      if (!name || !email) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Name and email are required',
        };
        return;
      }

      // 简单的邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Invalid email format',
        };
        return;
      }

      const contact = await this.contactService.createContact({ name, email });

      ctx.body = {
        success: true,
        data: contact,
        message: 'Contact created successfully',
      };
    } catch (error: any) {
      if (error.message === 'Email already exists') {
        ctx.status = 409;
        ctx.body = {
          success: false,
          message: 'Email already exists',
        };
      } else {
        console.error('Error creating contact:', error);
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Internal server error',
        };
      }
    }
  }

  @GET()
  async list(ctx: Context) {
    try {
      const contacts = await this.contactService.getContacts();
      ctx.body = {
        success: true,
        data: contacts,
        total: contacts.length,
      };
    } catch (error) {
      console.error('Error fetching contacts:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Failed to fetch contacts',
      };
    }
  }

  @route('/:id')
  @GET()
  async getById(ctx: Context) {
    try {
      const id = Number.parseInt(ctx.params.id, 10);

      if (Number.isNaN(id)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Invalid contact ID',
        };
        return;
      }

      const contact = await this.contactService.getContactById(id);

      if (!contact) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Contact not found',
        };
        return;
      }

      ctx.body = {
        success: true,
        data: contact,
      };
    } catch (error) {
      console.error('Error fetching contact:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Internal server error',
      };
    }
  }
}

export default ContactController;
