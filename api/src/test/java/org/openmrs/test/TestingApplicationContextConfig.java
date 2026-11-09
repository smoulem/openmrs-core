/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */
package org.openmrs.test;

import java.util.List;

import org.aopalliance.aop.Advice;
import org.openmrs.aop.ModuleFactoryBeanServiceAdvisorsTest.FactoryBeanModuleInnerServiceImpl;
import org.openmrs.aop.ModuleFactoryBeanServiceAdvisorsTest.FactoryBeanModuleServiceImpl;
import org.openmrs.api.AdministrationService;
import org.openmrs.api.ConceptService;
import org.openmrs.api.OpenmrsApplicationContextConfig;
import org.openmrs.api.cache.ServiceTestBeanImpl;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.interceptor.TransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionProxyFactoryBean;

@Configuration
@Import(OpenmrsApplicationContextConfig.class)
public class TestingApplicationContextConfig {

	@Bean
	public static BeanFactoryPostProcessor useSystemClassLoaderInTests() {
		return beanFactory -> beanFactory.getBeanDefinition("serviceContext").getPropertyValues().add("useSystemClassLoader",
		    true);
	}

	@Bean
	public org.openmrs.layout.name.NameSupport nameSupport() {
		return new org.openmrs.layout.name.NameSupport();
	}

	@Bean
	public ServiceTestBeanImpl serviceTestBeanImpl() {
		return new ServiceTestBeanImpl();
	}

	@Bean
	public TransactionProxyFactoryBean serviceTestBean(PlatformTransactionManager transactionManager,
	        ServiceTestBeanImpl serviceTestBeanImpl, @Qualifier("serviceInterceptors") List<Advice> serviceInterceptors,
	        TransactionAttributeSource transactionAttributeSource) {
		return transactionProxy(transactionManager, serviceTestBeanImpl, serviceInterceptors, transactionAttributeSource);
	}

	@Bean
	public FactoryBeanModuleInnerServiceImpl testFactoryBeanModuleInnerServiceImpl() {
		return new FactoryBeanModuleInnerServiceImpl();
	}

	@Bean(name = "test.FactoryBeanModuleInnerService")
	public TransactionProxyFactoryBean factoryBeanModuleInnerService(PlatformTransactionManager transactionManager,
	        FactoryBeanModuleInnerServiceImpl testFactoryBeanModuleInnerServiceImpl,
	        @Qualifier("serviceInterceptors") List<Advice> serviceInterceptors,
	        TransactionAttributeSource transactionAttributeSource) {
		return transactionProxy(transactionManager, testFactoryBeanModuleInnerServiceImpl, serviceInterceptors,
		    transactionAttributeSource);
	}

	@Bean(name = "test.FactoryBeanModuleServiceImpl")
	public FactoryBeanModuleServiceImpl testFactoryBeanModuleServiceImpl(ConceptService conceptService,
	        AdministrationService adminService) {
		FactoryBeanModuleServiceImpl service = new FactoryBeanModuleServiceImpl();
		service.setConceptService(conceptService);
		service.setAdminService(adminService);
		return service;
	}

	@Bean(name = "test.FactoryBeanModuleService")
	public TransactionProxyFactoryBean testFactoryBeanModuleService(PlatformTransactionManager transactionManager,
	        FactoryBeanModuleServiceImpl testFactoryBeanModuleServiceImpl,
	        @Qualifier("serviceInterceptors") List<Advice> serviceInterceptors,
	        TransactionAttributeSource transactionAttributeSource) {
		return transactionProxy(transactionManager, testFactoryBeanModuleServiceImpl, serviceInterceptors,
		    transactionAttributeSource);
	}

	private TransactionProxyFactoryBean transactionProxy(PlatformTransactionManager transactionManager, Object target,
	        List<Advice> interceptors, TransactionAttributeSource transactionAttributeSource) {
		TransactionProxyFactoryBean proxy = new TransactionProxyFactoryBean();
		proxy.setTransactionManager(transactionManager);
		proxy.setTarget(target);
		proxy.setPreInterceptors(interceptors);
		proxy.setTransactionAttributeSource(transactionAttributeSource);
		return proxy;
	}
}
