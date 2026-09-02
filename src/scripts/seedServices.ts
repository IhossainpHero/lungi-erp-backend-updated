// src/scripts/seedServices.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import Service from '../models/Service.model';
import User from '../models/User.model';

const services = [
  {
    serviceId: 'marchraise_shahajadpur_normal',
    label: 'মার্চরাইজ — শাহজাদপুর Normal',
    category: 'marchraise',
    location: 'shahajadpur',
    variant: 'normal',
    ratePerThan: 80,
    isActive: true,
  },
  {
    serviceId: 'marchraise_shahajadpur_vip',
    label: 'মার্চরাইজ — শাহজাদপুর VIP',
    category: 'marchraise',
    location: 'shahajadpur',
    variant: 'vip',
    ratePerThan: 110,
    isActive: true,
  },
  {
    serviceId: 'marchraise_dhaka',
    label: 'মার্চরাইজ — ঢাকা',
    category: 'marchraise',
    location: 'dhaka',
    variant: null,
    ratePerThan: 130,
    isActive: true,
  },
  {
    serviceId: 'wash_shahajadpur',
    label: 'ওয়াশ — শাহজাদপুর',
    category: 'wash',
    location: 'shahajadpur',
    variant: null,
    ratePerThan: 50,
    isActive: true,
  },
  {
    serviceId: 'wash_dhaka',
    label: 'ওয়াশ — ঢাকা',
    category: 'wash',
    location: 'dhaka',
    variant: null,
    ratePerThan: 70,
    isActive: true,
  },
  {
    serviceId: 'tana_shahajadpur',
    label: 'টানা — শাহজাদপুর',
    category: 'tana',
    location: 'shahajadpur',
    variant: null,
    ratePerThan: 40,
    isActive: true,
  },
];

const seed = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing in .env');

  await mongoose.connect(uri);
  console.log('✅ DB Connected');

  // Seed services
  for (const svc of services) {
    await Service.findOneAndUpdate(
      { serviceId: svc.serviceId },
      svc,
      { upsert: true, new: true }
    );
    console.log(`✅ Service: ${svc.label} — ৳${svc.ratePerThan}/থান`);
  }

  // Seed default admin (only if no admin exists)
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    await User.create({
      name: 'Admin',
      email: 'admin@lungierp.com',
      phone: '01700000000',
      password: 'admin123',
      role: 'admin',
      isActive: true,
    });
    console.log('✅ Default Admin created — email: admin@lungierp.com | pass: admin123');
    console.log('⚠️  Production-এ পাসওয়ার্ড অবশ্যই পরিবর্তন করুন!');
  }

  console.log('🎉 Seed সম্পন্ন!');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
