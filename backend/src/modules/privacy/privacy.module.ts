import { Module } from '@nestjs/common';
import { AnonymizeProcessor } from './anonymize.processor.js';

@Module({ providers: [AnonymizeProcessor] })
export class PrivacyModule {}
