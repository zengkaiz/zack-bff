import type { PrismaClient } from '@prisma/client';
import type PrismaService from './PrismaService';

interface IContactService {
  createContact(data: { name: string; email: string }): Promise<any>;
  getContacts(): Promise<any[]>;
  getContactById(id: number): Promise<any>;
}

class ContactService implements IContactService {
  private prisma: PrismaClient;

  constructor({ prismaService }: { prismaService: PrismaService }) {
    this.prisma = prismaService.getClient();
    console.log('ContactService initialized');
  }

  async createContact(data: { name: string; email: string }) {
    try {
      const contact = await this.prisma.contact.create({
        data: {
          name: data.name,
          email: data.email,
        },
      });
      return contact;
    } catch (error: any) {
      // P2002 是 Prisma 的唯一约束违反错误代码
      if (error.code === 'P2002') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  async getContacts() {
    return await this.prisma.contact.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getContactById(id: number) {
    return await this.prisma.contact.findUnique({
      where: { id },
    });
  }
}

export default ContactService;
